import { ConflictException } from '@nestjs/common';
import { prisma } from '../prisma';
import type { CriarMetodoManejoDto } from './dto';

/** Retorna os métodos globais (seed) + os customizados da empresa. */
export function listar(empresaId: string) {
  return prisma.metodoManejo.findMany({
    where: { OR: [{ empresaId: null }, { empresaId }] },
    orderBy: { nome: 'asc' },
  });
}

export function criar(empresaId: string, dto: CriarMetodoManejoDto) {
  return prisma.metodoManejo.create({ data: { nome: dto.nome, empresaId, tipo: dto.tipo } });
}

/** Só remove métodos customizados da própria empresa (nunca os globais). */
export async function remover(empresaId: string, id: string) {
  const emUsoNoHistorico = await prisma.loteMetodoHistorico.findFirst({ where: { metodoManejoId: id } });
  if (emUsoNoHistorico) {
    throw new ConflictException(['Este método já foi usado por algum lote (aparece no histórico) e não pode ser excluído.']);
  }
  await prisma.metodoManejo.deleteMany({ where: { id, empresaId } });
  return { ok: true };
}
