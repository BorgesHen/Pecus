import { NotFoundException } from '@nestjs/common';
import { diaISO } from '@pecus/shared';
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

/**
 * Ganho Médio Diário (GMD) do lote, entre o primeiro e o último peso conhecido
 * (peso médio de entrada, se houver; senão a primeira pesagem).
 *
 * Sem `max(1, dias)`. A versão anterior transformava "0 dias" em "1 dia", e a
 * primeira pesagem feita no mesmo dia da aquisição produzia um GMD absurdo — o
 * ganho inteiro do período aparecia como ganho de um dia, tipo 20 kg/dia num
 * bovino que ganha entre 0,5 e 2. O erro era silencioso: um número plausível na
 * forma, impossível no valor.
 *
 * Zero dias não é ganho pequeno, é ganho **desconhecido**: devolve nulo com a
 * explicação, igual ao GMD individual (ver `calcularGmdAnimal` em gmd-animal.ts,
 * que já fazia certo).
 */
export async function gmd(empresaId: string, loteId: string) {
  const lote = await garantirLoteDaEmpresa(empresaId, loteId);
  const pesagens = await prisma.pesagem.findMany({ where: { loteId }, orderBy: { data: 'asc' } });
  if (pesagens.length === 0) return { gmd: null, mensagem: 'Sem pesagens registradas.' };

  const primeira = pesagens[0];
  const ultima = pesagens[pesagens.length - 1];
  const pesoInicial = lote.pesoMedioEntrada ?? primeira.pesoMedio;
  const dataInicial = lote.pesoMedioEntrada ? lote.dataAquisicao : primeira.data;

  // Ancorado ao meio-dia: à meia-noite a diferença pode dar 0,96 ou 1,04 dia se
  // o horário de verão cair no meio do intervalo, e aí o arredondamento erra o dia.
  const dias = Math.round(
    (Date.parse(`${diaISO(ultima.data)}T12:00:00Z`) - Date.parse(`${diaISO(dataInicial)}T12:00:00Z`)) / 86_400_000,
  );

  if (dias <= 0) {
    return {
      gmd: null,
      pesoInicial,
      pesoAtual: ultima.pesoMedio,
      dias,
      mensagem:
        'A pesagem é do mesmo dia do peso inicial do lote — o ganho médio diário aparece a partir do dia seguinte.',
    };
  }

  const gmdCalculado = (ultima.pesoMedio - pesoInicial) / dias;
  return { gmd: Number(gmdCalculado.toFixed(3)), pesoInicial, pesoAtual: ultima.pesoMedio, dias };
}
