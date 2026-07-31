import { ForbiddenException, NotFoundException, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PapelUsuario, type UsuarioAutenticado } from '@pecus/shared';
import { prisma } from '../prisma';
import { assinarToken } from '../auth';
import { criarPlanoContasPadrao } from '../financeiro/plano-contas.service';
import * as convitesService from '../convites/convites.service';
import { checarBloqueioLogin, registrarTentativaLogin } from '../rate-limit';
import type { LoginDto, RegistrarDto } from './dto';

/**
 * Registro público: exige um código de convite válido e ainda não usado
 * (gerado pelo ADMIN depois de fechar o negócio com o cliente), e então cria
 * o usuário como RESPONSAVEL e já cria a fazenda dele, vinculando os dois.
 */
export async function registrar(dto: RegistrarDto) {
  const [usuariosConflitantes, empresaConflitante] = await Promise.all([
    prisma.usuario.findMany({
      where: { OR: [{ email: dto.email }, { usuario: dto.usuario }] },
    }),
    prisma.empresa.findFirst({
      where: { nome: { equals: dto.nomeEmpresa, mode: 'insensitive' } },
    }),
  ]);

  const conflitos: string[] = [];
  if (usuariosConflitantes.some((u) => u.email === dto.email)) {
    conflitos.push('E-mail já cadastrado. Use outro e-mail para continuar.');
  }
  if (usuariosConflitantes.some((u) => u.usuario === dto.usuario)) {
    conflitos.push('Usuário já em uso. Escolha outro nome de usuário.');
  }
  if (empresaConflitante) {
    conflitos.push('Nome da fazenda já cadastrado. Escolha um nome diferente.');
  }
  if (conflitos.length > 0) {
    throw new ConflictException(conflitos);
  }

  const senhaHash = await bcrypt.hash(dto.senha, 10);

  const resultado = await prisma.$transaction(async (tx) => {
    await convitesService.reivindicar(tx, dto.codigoConvite);

    const usuario = await tx.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        usuario: dto.usuario,
        senhaHash,
        papelGlobal: PapelUsuario.RESPONSAVEL,
      },
    });

    const empresa = await tx.empresa.create({
      data: { nome: dto.nomeEmpresa },
    });

    await tx.usuarioEmpresa.create({
      data: {
        usuarioId: usuario.id,
        empresaId: empresa.id,
        papel: PapelUsuario.RESPONSAVEL,
      },
    });

    await criarPlanoContasPadrao(tx, empresa.id);

    return { usuario, empresa };
  }, {
    // A transação faz várias escritas em sequência; o padrão do Prisma (5s)
    // não dá folga suficiente quando a latência até o banco é alta (produção
    // serverless), e estourar aqui derruba o cadastro inteiro com erro 500.
    timeout: 20_000,
    maxWait: 10_000,
  });

  return gerarToken(resultado.usuario, resultado.empresa.id);
}

export async function login(dto: LoginDto, ip: string) {
  await checarBloqueioLogin(dto.usuario, ip);

  const usuario = await prisma.usuario.findUnique({
    where: { usuario: dto.usuario },
    include: { empresas: true },
  });
  const senhaOk = usuario ? await bcrypt.compare(dto.senha, usuario.senhaHash) : false;
  await registrarTentativaLogin(dto.usuario, ip, senhaOk);

  if (!usuario || !senhaOk) {
    throw new UnauthorizedException('Credenciais inválidas.');
  }

  // Seleciona a primeira empresa como ativa (o front pode trocar depois)
  const empresaAtivaId = usuario.empresas[0]?.empresaId;
  return gerarToken(usuario, empresaAtivaId);
}

/** Reemite o token com outra empresaAtivaId — só se o usuário tiver vínculo com ela (ou for ADMIN). */
export async function trocarEmpresa(usuarioId: string, empresaId: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new UnauthorizedException('Sessão inválida.');

  if (usuario.papelGlobal === PapelUsuario.ADMIN) {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada.');
  } else {
    const vinculo = await prisma.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId, empresaId } },
    });
    if (!vinculo) throw new ForbiddenException('Você não tem acesso a esta empresa.');
  }

  return gerarToken(usuario, empresaId);
}

function gerarToken(
  usuario: { id: string; email: string; nome: string; papelGlobal: string },
  empresaAtivaId?: string,
) {
  const payload: UsuarioAutenticado = {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    papelGlobal: usuario.papelGlobal as PapelUsuario,
    empresaAtivaId,
  };

  return {
    access_token: assinarToken(payload),
    usuario: payload,
  };
}
