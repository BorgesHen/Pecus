import { NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma';
import type { CriarAreaDto, AtualizarAreaDto } from './dto';

export function listar(empresaId: string) {
  return prisma.area.findMany({
    where: { empresaId },
    include: { _count: { select: { piquetes: true, lotes: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function detalhar(empresaId: string, id: string) {
  const area = await prisma.area.findFirst({
    where: { id, empresaId },
    include: { piquetes: true, lotes: { select: { id: true, identificacao: true } } },
  });
  if (!area) throw new NotFoundException('Área não encontrada.');
  return area;
}

export function criar(empresaId: string, dto: CriarAreaDto) {
  return prisma.area.create({ data: { empresaId, nome: dto.nome, areaHectares: dto.areaHectares } });
}

export async function atualizar(empresaId: string, id: string, dto: AtualizarAreaDto) {
  await detalhar(empresaId, id);
  return prisma.area.update({ where: { id }, data: dto });
}

export async function remover(empresaId: string, id: string) {
  const area = await detalhar(empresaId, id);
  await prisma.area.delete({ where: { id } });
  // O nome volta pra trilha de atividades poder registrar o que foi excluído.
  return { ok: true, nome: area.nome };
}
