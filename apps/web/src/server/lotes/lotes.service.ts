import { BadRequestException, NotFoundException } from '@nestjs/common';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import type { CriarLoteDto, AtualizarLoteDto, TrocarMetodoLoteDto } from './dto';

async function garantirAreaDaEmpresa(empresaId: string, areaId: string) {
  const area = await prisma.area.findFirst({ where: { id: areaId, empresaId } });
  if (!area) throw new NotFoundException('Área não encontrada nesta empresa.');
}

export function listar(empresaId: string) {
  return prisma.lote.findMany({
    where: { empresaId },
    include: { metodoManejo: true, _count: { select: { pesagens: true, gastos: true } } },
    orderBy: { dataAquisicao: 'desc' },
  });
}

export async function detalhar(empresaId: string, id: string) {
  const lote = await prisma.lote.findFirst({
    where: { id, empresaId },
    include: {
      metodoManejo: true,
      area: true,
      pesagens: { orderBy: { data: 'asc' } },
      gastos: { orderBy: { data: 'desc' } },
      metodoHistorico: { include: { metodoManejo: true }, orderBy: { dataInicio: 'desc' } },
    },
  });
  if (!lote) throw new NotFoundException('Lote não encontrado.');
  return lote;
}

export async function criar(empresaId: string, dtoOriginal: CriarLoteDto) {
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'lotes', camposDesativados);
  if (dto.areaId) await garantirAreaDaEmpresa(empresaId, dto.areaId);
  const dataAquisicao = new Date(dto.dataAquisicao);
  return prisma.$transaction(async (tx) => {
    const lote = await tx.lote.create({
      data: {
        empresaId,
        identificacao: dto.identificacao,
        dataAquisicao,
        quantidadeAnimais: dto.quantidadeAnimais,
        pesoMedioEntrada: dto.pesoMedioEntrada,
        metodoManejoId: dto.metodoManejoId,
        areaId: dto.areaId,
        rendimentoCarcaca: dto.rendimentoCarcaca,
        gmdEsperado: dto.gmdEsperado,
      },
    });

    if (dto.metodoManejoId) {
      await tx.loteMetodoHistorico.create({
        data: { loteId: lote.id, metodoManejoId: dto.metodoManejoId, dataInicio: dataAquisicao },
      });
    }

    return lote;
  });
}

export async function atualizar(empresaId: string, id: string, dtoOriginal: AtualizarLoteDto) {
  await detalhar(empresaId, id);
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'lotes', camposDesativados);
  if (dto.areaId) await garantirAreaDaEmpresa(empresaId, dto.areaId);
  return prisma.lote.update({
    where: { id },
    data: { ...dto, dataAquisicao: dto.dataAquisicao ? new Date(dto.dataAquisicao) : undefined },
  });
}

/** Troca o método de manejo do lote, fechando a fase atual e abrindo uma nova no histórico. */
export async function trocarMetodo(empresaId: string, id: string, dto: TrocarMetodoLoteDto) {
  const lote = await detalhar(empresaId, id);
  const dataTroca = new Date(dto.dataTroca);

  const faseAberta = lote.metodoHistorico.find((h) => h.dataFim === null);
  if (faseAberta && dataTroca < faseAberta.dataInicio) {
    throw new BadRequestException('A data da troca não pode ser anterior ao início da fase atual.');
  }

  return prisma.$transaction(async (tx) => {
    if (faseAberta) {
      await tx.loteMetodoHistorico.update({ where: { id: faseAberta.id }, data: { dataFim: dataTroca } });
    }
    await tx.loteMetodoHistorico.create({
      data: { loteId: id, metodoManejoId: dto.metodoManejoId, dataInicio: dataTroca },
    });
    return tx.lote.update({ where: { id }, data: { metodoManejoId: dto.metodoManejoId } });
  });
}

export async function remover(empresaId: string, id: string) {
  await detalhar(empresaId, id);
  await prisma.lote.delete({ where: { id } });
  return { ok: true };
}
