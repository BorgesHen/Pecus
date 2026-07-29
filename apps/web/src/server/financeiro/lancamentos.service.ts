import { NotFoundException } from '@nestjs/common';
import { NaturezaFinanceira, StatusLancamento } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import type { CriarLancamentoDto, LiquidarLancamentoDto } from './dto/lancamento.dto';

export interface FiltrosLancamento {
  natureza?: NaturezaFinanceira;
  loteId?: string;
  contaId?: string;
  de?: string;
  ate?: string;
  status?: 'aberto' | 'liquidado';
}

function adicionarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}

/** Divide o valor total em N parcelas iguais, jogando o resto de centavos na última — soma sempre bate. */
function calcularValoresParcelas(valorTotal: number, totalParcelas: number): number[] {
  const centavosTotal = Math.round(valorTotal * 100);
  const base = Math.floor(centavosTotal / totalParcelas);
  const resto = centavosTotal - base * totalParcelas;
  return Array.from({ length: totalParcelas }, (_, i) => (i === totalParcelas - 1 ? base + resto : base) / 100);
}

function calcularStatus(dataVencimento: Date, dataLiquidacao: Date | null): StatusLancamento {
  if (dataLiquidacao) return StatusLancamento.LIQUIDADO;
  return dataVencimento < new Date() ? StatusLancamento.ATRASADO : StatusLancamento.EM_ABERTO;
}

async function garantirContaDaEmpresa(empresaId: string, contaId: string) {
  const conta = await prisma.contaFinanceira.findFirst({ where: { id: contaId, grupo: { empresaId } } });
  if (!conta) throw new NotFoundException('Conta financeira não encontrada nesta empresa.');
}

async function garantirLoteDaEmpresa(empresaId: string, loteId: string) {
  const lote = await prisma.lote.findFirst({ where: { id: loteId, empresaId } });
  if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
}

async function garantirContatoDaEmpresa(empresaId: string, contatoId: string) {
  const contato = await prisma.contato.findFirst({ where: { id: contatoId, empresaId } });
  if (!contato) throw new NotFoundException('Contato não encontrado nesta empresa.');
}

async function garantirContaBancariaDaEmpresa(empresaId: string, contaBancariaId: string) {
  const conta = await prisma.contaBancaria.findFirst({ where: { id: contaBancariaId, empresaId } });
  if (!conta) throw new NotFoundException('Conta bancária não encontrada nesta empresa.');
}

async function garantirLancamentoDaEmpresa(empresaId: string, id: string) {
  const lancamento = await prisma.lancamento.findFirst({ where: { id, empresaId } });
  if (!lancamento) throw new NotFoundException('Lançamento não encontrado nesta empresa.');
  return lancamento;
}

export async function listar(empresaId: string, filtros: FiltrosLancamento) {
  const where: Record<string, unknown> = { empresaId };
  if (filtros.loteId) where.loteId = filtros.loteId;
  if (filtros.contaId) where.contaId = filtros.contaId;
  if (filtros.natureza) where.conta = { grupo: { natureza: filtros.natureza } };
  if (filtros.de || filtros.ate) {
    where.dataDocumento = {
      ...(filtros.de ? { gte: new Date(filtros.de) } : {}),
      ...(filtros.ate ? { lte: new Date(filtros.ate) } : {}),
    };
  }
  if (filtros.status === 'liquidado') where.dataLiquidacao = { not: null };
  else if (filtros.status === 'aberto') where.dataLiquidacao = null;

  const lancamentos = await prisma.lancamento.findMany({
    where,
    include: {
      conta: { include: { grupo: true } },
      lote: { select: { id: true, identificacao: true } },
      contato: true,
      contaBancaria: true,
    },
    orderBy: { dataVencimento: 'asc' },
  });

  return lancamentos.map((l) => ({ ...l, status: calcularStatus(l.dataVencimento, l.dataLiquidacao) }));
}

export function contasAPagar(empresaId: string) {
  return listar(empresaId, { natureza: NaturezaFinanceira.DESPESA, status: 'aberto' });
}

export function contasAReceber(empresaId: string) {
  return listar(empresaId, { natureza: NaturezaFinanceira.RECEITA, status: 'aberto' });
}

export async function criar(empresaId: string, dtoOriginal: CriarLancamentoDto) {
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'lancamentos', camposDesativados);

  await garantirContaDaEmpresa(empresaId, dto.contaId);
  if (dto.loteId) await garantirLoteDaEmpresa(empresaId, dto.loteId);
  if (dto.contatoId) await garantirContatoDaEmpresa(empresaId, dto.contatoId);
  if (dto.contaBancariaId) await garantirContaBancariaDaEmpresa(empresaId, dto.contaBancariaId);

  const totalParcelas = dto.totalParcelas ?? 1;
  const valoresParcelas = calcularValoresParcelas(dto.valorTotal, totalParcelas);
  const dataDocumento = new Date(dto.dataDocumento);
  const dataVencimentoBase = new Date(dto.dataVencimento);
  const dataLiquidacaoPrimeiraParcela = dto.dataLiquidacao ? new Date(dto.dataLiquidacao) : null;

  return prisma.$transaction((tx) =>
    Promise.all(
      valoresParcelas.map((valorParcela, indice) =>
        tx.lancamento.create({
          data: {
            empresaId,
            contaId: dto.contaId,
            loteId: dto.loteId,
            contatoId: dto.contatoId,
            contaBancariaId: dto.contaBancariaId,
            formaPagamento: dto.formaPagamento,
            descricao: dto.descricao,
            documento: dto.documento,
            valorTotal: dto.valorTotal,
            totalParcelas,
            numeroParcela: indice + 1,
            valorParcela,
            dataDocumento,
            dataVencimento: adicionarMeses(dataVencimentoBase, indice),
            dataLiquidacao: indice === 0 ? dataLiquidacaoPrimeiraParcela : null,
          },
        }),
      ),
    ),
  );
}

export async function liquidar(empresaId: string, id: string, dto: LiquidarLancamentoDto) {
  await garantirLancamentoDaEmpresa(empresaId, id);
  if (dto.contaBancariaId) await garantirContaBancariaDaEmpresa(empresaId, dto.contaBancariaId);
  return prisma.lancamento.update({
    where: { id },
    data: { dataLiquidacao: new Date(dto.dataLiquidacao), contaBancariaId: dto.contaBancariaId },
  });
}

export async function remover(empresaId: string, id: string) {
  await garantirLancamentoDaEmpresa(empresaId, id);
  await prisma.lancamento.delete({ where: { id } });
  return { ok: true };
}
