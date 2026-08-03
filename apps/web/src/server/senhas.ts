import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { prisma } from './prisma';
import { DIAS_VALIDADE_PROVISORIA, TAMANHO_MINIMO_SENHA } from '@pecus/shared';

/**
 * Senha provisória: sem I, O, 0 e 1, porque essa senha é lida de um e-mail (ou
 * de um print no WhatsApp) e digitada à mão — confundir zero com "O" é o erro
 * mais comum aí. Mesmo alfabeto dos códigos de convite, pela mesma razão.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GRUPOS = 3;
const TAMANHO_GRUPO = 4;

/** Ex: "K7M2-9XQP-4RTB" — 12 caracteres de um alfabeto de 32 (60 bits). */
export function gerarSenhaProvisoria(): string {
  const grupo = () =>
    Array.from({ length: TAMANHO_GRUPO }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
  return Array.from({ length: GRUPOS }, grupo).join('-');
}

export function validadeProvisoria(): Date {
  return new Date(Date.now() + DIAS_VALIDADE_PROVISORIA * 24 * 60 * 60 * 1000);
}

/**
 * Troca a senha do usuário por uma provisória. A senha atual é substituída de
 * propósito: é isso que impede que a antiga continue valendo depois de um
 * reset pedido por quem perdeu o acesso.
 *
 * Devolve a senha em claro — é a única chance de vê-la, já que só o hash fica
 * guardado.
 */
export async function aplicarSenhaProvisoria(
  usuarioId: string,
  enviadaPorEmail: boolean,
): Promise<string> {
  const senha = gerarSenhaProvisoria();
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      senhaHash: await bcrypt.hash(senha, 10),
      senhaProvisoria: true,
      senhaProvisoriaExpiraEm: validadeProvisoria(),
      senhaProvisoriaEnviadaPorEmail: enviadaPorEmail,
    },
  });
  return senha;
}

/**
 * Fecha o ciclo: a pessoa define a senha dela e o acesso deixa de ser
 * provisório. Se a provisória tinha saído por e-mail, o fato de ela ter
 * conseguido entrar prova que aquele endereço existe e é dela — é assim que a
 * confirmação de e-mail acontece, sem um segundo fluxo de link.
 */
export async function definirSenhaDefinitiva(usuarioId: string, novaSenha: string) {
  if (novaSenha.trim().length < TAMANHO_MINIMO_SENHA) {
    throw new BadRequestException([`A senha precisa ter ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`]);
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new BadRequestException('Sessão inválida.');

  const mesmaDeAntes = await bcrypt.compare(novaSenha, usuario.senhaHash);
  if (mesmaDeAntes) {
    throw new BadRequestException(['A nova senha não pode ser igual à provisória.']);
  }

  return prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      senhaHash: await bcrypt.hash(novaSenha, 10),
      senhaProvisoria: false,
      senhaProvisoriaExpiraEm: null,
      emailVerificadoEm: usuario.senhaProvisoriaEnviadaPorEmail
        ? usuario.emailVerificadoEm ?? new Date()
        : usuario.emailVerificadoEm,
      senhaProvisoriaEnviadaPorEmail: false,
    },
  });
}

/** Provisória vencida não deixa entrar — a pessoa pede outra na tela de login. */
export function provisoriaVencida(usuario: {
  senhaProvisoria: boolean;
  senhaProvisoriaExpiraEm: Date | null;
}): boolean {
  if (!usuario.senhaProvisoria || !usuario.senhaProvisoriaExpiraEm) return false;
  return usuario.senhaProvisoriaExpiraEm.getTime() < Date.now();
}
