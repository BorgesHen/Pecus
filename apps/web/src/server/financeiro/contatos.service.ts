import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TipoContato } from '@prisma/client';
import { prisma } from '../prisma';
import type { CriarContatoDto, AtualizarContatoDto } from './dto/contato.dto';

async function garantirContatoDaEmpresa(empresaId: string, id: string) {
  const contato = await prisma.contato.findFirst({ where: { id, empresaId } });
  if (!contato) throw new NotFoundException('Contato não encontrado nesta empresa.');
  return contato;
}

export function listar(empresaId: string, tipo?: TipoContato) {
  return prisma.contato.findMany({ where: { empresaId, tipo }, orderBy: { nome: 'asc' } });
}

export function criar(empresaId: string, dto: CriarContatoDto) {
  return prisma.contato.create({ data: { empresaId, ...dto } });
}

export async function atualizar(empresaId: string, id: string, dto: AtualizarContatoDto) {
  await garantirContatoDaEmpresa(empresaId, id);
  return prisma.contato.update({ where: { id }, data: dto });
}

export async function remover(empresaId: string, id: string) {
  await garantirContatoDaEmpresa(empresaId, id);
  const lancamentos = await prisma.lancamento.count({ where: { contatoId: id } });
  if (lancamentos > 0) throw new BadRequestException('Este contato já tem lançamentos vinculados — não pode ser excluído.');
  await prisma.contato.delete({ where: { id } });
  return { ok: true };
}
