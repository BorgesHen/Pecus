import { NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma';
import type { CriarPesagemDto } from './dto';

async function garantirLoteDaEmpresa(empresaId: string, loteId: string) {
  const lote = await prisma.lote.findFirst({ where: { id: loteId, empresaId } });
  if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
  return lote;
}

export async function listarPorLote(empresaId: string, loteId: string) {
  await garantirLoteDaEmpresa(empresaId, loteId);
  return prisma.pesagem.findMany({ where: { loteId }, orderBy: { data: 'asc' } });
}

export async function criar(empresaId: string, dto: CriarPesagemDto) {
  const lote = await garantirLoteDaEmpresa(empresaId, dto.loteId);
  const pesagem = await prisma.pesagem.create({
    data: { loteId: dto.loteId, data: new Date(dto.data), pesoMedio: dto.pesoMedio },
  });
  // A identificação do lote acompanha a pesagem pra trilha de atividades não
  // precisar de outra consulta pra escrever a linha do histórico.
  return { ...pesagem, loteIdentificacao: lote.identificacao };
}

/** Ganho Médio Diário (GMD) do lote com base na primeira e última pesagem (ou peso de entrada, se houver). */
export async function gmd(empresaId: string, loteId: string) {
  const lote = await garantirLoteDaEmpresa(empresaId, loteId);
  const pesagens = await prisma.pesagem.findMany({ where: { loteId }, orderBy: { data: 'asc' } });
  if (pesagens.length === 0) return { gmd: null, mensagem: 'Sem pesagens registradas.' };

  const primeira = pesagens[0];
  const ultima = pesagens[pesagens.length - 1];
  const pesoInicial = lote.pesoMedioEntrada ?? primeira.pesoMedio;
  const dataInicial = lote.pesoMedioEntrada ? lote.dataAquisicao : primeira.data;
  const dias = Math.max(1, Math.round((ultima.data.getTime() - dataInicial.getTime()) / (1000 * 60 * 60 * 24)));
  const gmdCalculado = (ultima.pesoMedio - pesoInicial) / dias;

  return { gmd: Number(gmdCalculado.toFixed(3)), pesoInicial, pesoAtual: ultima.pesoMedio, dias };
}
