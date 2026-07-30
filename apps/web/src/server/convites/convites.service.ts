import { randomBytes } from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import type { CriarConviteDto } from './dto';

// Sem O/0/I/1 pra evitar confusão ao digitar o código.
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function gerarCodigo(): string {
  const bytes = randomBytes(8);
  let codigo = '';
  for (let i = 0; i < 8; i++) {
    codigo += ALFABETO_CODIGO[bytes[i] % ALFABETO_CODIGO.length];
  }
  return codigo;
}

/** Só o ADMIN gerencia convites — não é um recurso por empresa. */
export function listar() {
  return prisma.conviteCadastro.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function criar(dto: CriarConviteDto) {
  let codigo = gerarCodigo();
  // Colisão é praticamente impossível (33^8 combinações), mas garante unicidade mesmo assim.
  while (await prisma.conviteCadastro.findUnique({ where: { codigo } })) {
    codigo = gerarCodigo();
  }
  return prisma.conviteCadastro.create({
    data: { codigo, observacao: dto.observacao },
  });
}

export async function remover(id: string) {
  const convite = await prisma.conviteCadastro.findUnique({ where: { id } });
  if (!convite) throw new NotFoundException('Convite não encontrado.');
  if (convite.usadoEm) throw new BadRequestException('Convite já usado, não pode ser removido.');
  await prisma.conviteCadastro.delete({ where: { id } });
}

/**
 * Reivindica um código de convite dentro da transação de registro. Usa um
 * UPDATE condicional (em vez de checar e depois atualizar) pra ser atômico —
 * evita que dois registros simultâneos usem o mesmo código de convite.
 */
export async function reivindicar(tx: Prisma.TransactionClient, codigo: string) {
  const resultado = await tx.conviteCadastro.updateMany({
    where: { codigo, usadoEm: null },
    data: { usadoEm: new Date() },
  });
  if (resultado.count === 0) {
    throw new BadRequestException('Código de convite inválido ou já utilizado.');
  }
}
