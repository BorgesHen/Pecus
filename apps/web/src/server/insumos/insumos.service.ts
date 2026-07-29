import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoMovimentoInsumo } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { prisma } from '../prisma';
import * as empresasService from '../empresas/empresas.service';
import type { CriarInsumoDto, AtualizarInsumoDto, RegistrarConsumoDto } from './dto';

async function calcularSaldo(insumoId: string) {
  const [entradas, saidas] = await Promise.all([
    prisma.movimentoInsumo.aggregate({ where: { insumoId, tipo: TipoMovimentoInsumo.ENTRADA }, _sum: { quantidade: true } }),
    prisma.movimentoInsumo.aggregate({ where: { insumoId, tipo: TipoMovimentoInsumo.SAIDA }, _sum: { quantidade: true } }),
  ]);
  return (entradas._sum.quantidade ?? 0) - (saidas._sum.quantidade ?? 0);
}

export async function listar(empresaId: string) {
  const insumos = await prisma.insumo.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  return Promise.all(insumos.map(async (insumo) => ({ ...insumo, saldoAtual: await calcularSaldo(insumo.id) })));
}

export async function detalhar(empresaId: string, id: string) {
  const insumo = await prisma.insumo.findFirst({ where: { id, empresaId } });
  if (!insumo) throw new NotFoundException('Insumo não encontrado.');
  return { ...insumo, saldoAtual: await calcularSaldo(id) };
}

export async function criar(empresaId: string, dtoOriginal: CriarInsumoDto) {
  const existente = await prisma.insumo.findFirst({ where: { empresaId, nome: dtoOriginal.nome } });
  if (existente) throw new ConflictException(['Já existe um insumo com esse nome nesta fazenda.']);

  const camposDesativados = await empresasService.obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'estoque', camposDesativados);

  return prisma.insumo.create({ data: { empresaId, nome: dto.nome, unidade: dto.unidade, estoqueMinimo: dto.estoqueMinimo } });
}

export async function atualizar(empresaId: string, id: string, dtoOriginal: AtualizarInsumoDto) {
  await detalhar(empresaId, id);
  const camposDesativados = await empresasService.obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'estoque', camposDesativados);
  return prisma.insumo.update({ where: { id }, data: dto });
}

export function listarMovimentos(empresaId: string, insumoId: string) {
  return prisma.movimentoInsumo.findMany({ where: { empresaId, insumoId }, orderBy: { data: 'desc' } });
}

export async function registrarConsumo(empresaId: string, insumoId: string, dto: RegistrarConsumoDto) {
  await detalhar(empresaId, insumoId);
  return prisma.movimentoInsumo.create({
    data: { empresaId, insumoId, tipo: TipoMovimentoInsumo.SAIDA, quantidade: dto.quantidade, data: new Date(dto.data), observacao: dto.observacao },
  });
}
