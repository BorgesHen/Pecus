import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ModuloSistema, NivelAcesso, PapelUsuario, type PermissoesGranulares } from '@pecus/shared';
import { prisma } from '../prisma';
import { aplicarSenhaProvisoria, gerarSenhaProvisoria, validadeProvisoria } from '../senhas';
import * as emailService from '../email/email.service';
import type { CriarUsuarioDto, AtualizarPermissoesDto, AtualizarUsuarioDto } from './dto';

/** RESPONSAVEL/ADMIN têm acesso irrestrito: sintetiza EDITAR em todo módulo. */
const PERMISSOES_ACESSO_TOTAL: PermissoesGranulares = {
  [ModuloSistema.LOTES]: NivelAcesso.EDITAR,
  [ModuloSistema.PESAGENS]: NivelAcesso.EDITAR,
  [ModuloSistema.GASTOS]: NivelAcesso.EDITAR,
  [ModuloSistema.RELATORIOS]: NivelAcesso.EDITAR,
  [ModuloSistema.USUARIOS]: NivelAcesso.EDITAR,
  [ModuloSistema.ANIMAIS]: NivelAcesso.EDITAR,
  [ModuloSistema.SANIDADE]: NivelAcesso.EDITAR,
  [ModuloSistema.REPRODUCAO]: NivelAcesso.EDITAR,
  [ModuloSistema.ESTOQUE]: NivelAcesso.EDITAR,
  [ModuloSistema.METODOS_MANEJO]: NivelAcesso.EDITAR,
  [ModuloSistema.PIQUETES]: NivelAcesso.EDITAR,
  [ModuloSistema.AREAS]: NivelAcesso.EDITAR,
  [ModuloSistema.FINANCEIRO]: NivelAcesso.EDITAR,
};

/** Lista os usuários vinculados à empresa (visão do responsável). */
export function listarDaEmpresa(empresaId: string) {
  return prisma.usuarioEmpresa.findMany({
    where: { empresaId },
    include: {
      usuario: {
        select: {
          id: true, nome: true, email: true, usuario: true, createdAt: true,
          // A tela mostra quem ainda não definiu senha e quem já confirmou o e-mail.
          senhaProvisoria: true, senhaProvisoriaExpiraEm: true, emailVerificadoEm: true,
        },
      },
    },
  });
}

/**
 * Cria um usuário na empresa ativa. O responsável NÃO pode criar ADMIN
 * (liberar acesso global é função exclusiva do admin do sistema).
 */
export async function criarNaEmpresa(empresaId: string, dto: CriarUsuarioDto) {
  const papel = dto.papel ?? PapelUsuario.USUARIO;
  if (papel === PapelUsuario.ADMIN) {
    throw new BadRequestException('Responsável não pode criar usuário ADMIN.');
  }

  const senhaProvisoria = gerarSenhaProvisoria();
  let criouConta = false;

  const vinculo = await prisma.$transaction(async (tx) => {
    let usuario = await tx.usuario.findUnique({ where: { email: dto.email } });

    if (!usuario) {
      const usuarioEmUso = await tx.usuario.findUnique({ where: { usuario: dto.usuario } });
      if (usuarioEmUso) {
        throw new ConflictException(['Usuário já em uso. Escolha outro nome de usuário.']);
      }

      usuario = await tx.usuario.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          usuario: dto.usuario,
          // O responsável não escolhe senha de ninguém: a conta nasce com uma
          // provisória e a pessoa define a definitiva no primeiro acesso.
          senhaHash: await bcrypt.hash(senhaProvisoria, 10),
          papelGlobal: papel,
          senhaProvisoria: true,
          senhaProvisoriaExpiraEm: validadeProvisoria(),
        },
      });
      criouConta = true;
    }

    const jaVinculado = await tx.usuarioEmpresa.findUnique({
      where: { usuarioId_empresaId: { usuarioId: usuario.id, empresaId } },
    });
    if (jaVinculado) {
      throw new ConflictException([
        'Usuário já vinculado a esta empresa. Edite ou remova o vínculo existente na lista antes de tentar novamente.',
      ]);
    }

    return tx.usuarioEmpresa.create({
      data: {
        usuarioId: usuario.id,
        empresaId,
        papel,
        permissoes: dto.permissoes ?? {},
      },
    });
  });

  // Conta que já existia (e-mail conhecido) só ganhou o vínculo: a senha dela é
  // dela, não se toca. Não há provisória pra entregar nesse caso.
  if (!criouConta) {
    return { vinculo, contaNova: false as const, senhaProvisoria: null, emailEnviado: false };
  }

  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { nome: true } });
  const { enviado } = await emailService.enviar({
    para: dto.email,
    ...emailService.mensagemBoasVindas(dto.nome, dto.usuario, senhaProvisoria, empresa?.nome ?? 'sua fazenda'),
  });

  if (enviado) {
    await prisma.usuario.update({
      where: { id: vinculo.usuarioId },
      data: { senhaProvisoriaEnviadaPorEmail: true },
    });
  }

  // A senha em claro volta pro responsável de propósito: é o que permite
  // repassar no WhatsApp quando o e-mail não sai (ou o SMTP nem está
  // configurado ainda). Só quem pode gerenciar usuários chega aqui.
  return { vinculo, contaNova: true as const, senhaProvisoria, emailEnviado: enviado };
}

/**
 * Reseta a senha de alguém da fazenda. A senha atual é substituída pela
 * provisória na hora — é isso que resolve o caso "perdi o acesso": a antiga
 * deixa de valer imediatamente.
 */
export async function resetarSenha(empresaId: string, usuarioId: string) {
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    include: { usuario: { select: { id: true, nome: true, email: true, usuario: true } } },
  });
  if (!vinculo) throw new NotFoundException('Usuário não vinculado a esta empresa.');

  const senhaProvisoria = await aplicarSenhaProvisoria(usuarioId, false);

  const { enviado } = await emailService.enviar({
    para: vinculo.usuario.email,
    ...emailService.mensagemSenhaRedefinida(vinculo.usuario.nome, vinculo.usuario.usuario, senhaProvisoria),
  });

  if (enviado) {
    await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaProvisoriaEnviadaPorEmail: true } });
  }

  return {
    usuario: vinculo.usuario.usuario,
    nome: vinculo.usuario.nome,
    email: vinculo.usuario.email,
    senhaProvisoria,
    emailEnviado: enviado,
    diasValidade: emailService.DIAS_VALIDADE_PROVISORIA,
  };
}

/** Atualiza permissões granulares de um usuário dentro da empresa. */
export async function atualizarPermissoes(empresaId: string, usuarioId: string, dto: AtualizarPermissoesDto) {
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
  });
  if (!vinculo) throw new NotFoundException('Usuário não vinculado a esta empresa.');

  return prisma.usuarioEmpresa.update({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
    data: { permissoes: dto.permissoes },
  });
}

/**
 * Edita nome, usuário (login) e/ou e-mail de um usuário vinculado à empresa.
 * Garante que o novo e-mail/usuário não colidam com a conta de outra pessoa.
 */
export async function atualizarInfo(empresaId: string, usuarioId: string, dto: AtualizarUsuarioDto) {
  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
  });
  if (!vinculo) throw new NotFoundException('Usuário não vinculado a esta empresa.');

  if (dto.email || dto.usuario) {
    const conflitos = await prisma.usuario.findMany({
      where: {
        id: { not: usuarioId },
        OR: [
          ...(dto.email ? [{ email: dto.email }] : []),
          ...(dto.usuario ? [{ usuario: dto.usuario }] : []),
        ],
      },
    });
    const emailEmUso = !!dto.email && conflitos.some((u) => u.email === dto.email);
    const usuarioEmUso = !!dto.usuario && conflitos.some((u) => u.usuario === dto.usuario);

    const mensagens: string[] = [];
    if (emailEmUso) mensagens.push('E-mail já cadastrado para outro usuário. Use outro e-mail.');
    if (usuarioEmUso) mensagens.push('Usuário já em uso por outra conta. Escolha outro nome de usuário.');
    if (mensagens.length > 0) {
      throw new ConflictException(mensagens);
    }
  }

  return prisma.usuario.update({
    where: { id: usuarioId },
    data: { nome: dto.nome, usuario: dto.usuario, email: dto.email },
  });
}

/** Remove o vínculo do usuário com a empresa (não apaga a conta dele). */
export async function removerDaEmpresa(empresaId: string, usuarioId: string) {
  await prisma.usuarioEmpresa.deleteMany({ where: { empresaId, usuarioId } });
  return { ok: true };
}

/**
 * Papel + permissões do usuário logado na empresa ativa, para o frontend
 * ajustar navegação e ações sem repetir a checagem que o backend já faz.
 * ADMIN e RESPONSAVEL recebem acesso total sintetizado (são donos/suporte).
 */
export async function obterMinhasPermissoes(
  empresaId: string,
  usuarioId: string,
  papelGlobal: PapelUsuario,
): Promise<{ papel: PapelUsuario; permissoes: PermissoesGranulares }> {
  if (papelGlobal === PapelUsuario.ADMIN) {
    return { papel: PapelUsuario.ADMIN, permissoes: PERMISSOES_ACESSO_TOTAL };
  }

  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId, empresaId } },
  });
  if (!vinculo) throw new NotFoundException('Usuário sem vínculo com esta empresa.');

  if (vinculo.papel === PapelUsuario.RESPONSAVEL) {
    return { papel: PapelUsuario.RESPONSAVEL, permissoes: PERMISSOES_ACESSO_TOTAL };
  }

  return {
    papel: PapelUsuario.USUARIO,
    permissoes: (vinculo.permissoes ?? {}) as PermissoesGranulares,
  };
}
