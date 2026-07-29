import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ModuloSistema, NivelAcesso, PapelUsuario, type PermissoesGranulares } from '@pecus/shared';
import { prisma } from '../prisma';
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
      usuario: { select: { id: true, nome: true, email: true, usuario: true, createdAt: true } },
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

  return prisma.$transaction(async (tx) => {
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
          senhaHash: await bcrypt.hash(dto.senha, 10),
          papelGlobal: papel,
        },
      });
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
