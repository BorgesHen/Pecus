import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NaturezaFinanceira, StatusLancamento, diaJaPassou } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import type {
  AtualizarLancamentoDto,
  CriarLancamentoDto,
  LiquidarLancamentoDto,
} from './dto/lancamento.dto';

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

/**
 * Atrasado é quem venceu **antes de hoje** — comparação de dia, não de instante.
 *
 * Antes era `dataVencimento < new Date()`. O vencimento é gravado como meia-noite
 * UTC (`2026-08-05T00:00:00Z`), então às 21h de Brasília do dia 4 aquele instante
 * já passou e a parcela do dia 5 aparecia "Atrasado" — mais de um dia antes de
 * realmente atrasar.
 *
 * `diaJaPassou` compara dia com dia, usando **hoje no fuso da fazenda** (ver
 * datas.ts). Comparar com o dia em UTC deixaria uma janela de três horas por
 * noite em que a parcela de hoje já apareceria atrasada — o mesmo erro, menor.
 */
function calcularStatus(dataVencimento: Date, dataLiquidacao: Date | null): StatusLancamento {
  if (dataLiquidacao) return StatusLancamento.LIQUIDADO;
  return diaJaPassou(dataVencimento) ? StatusLancamento.ATRASADO : StatusLancamento.EM_ABERTO;
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

/**
 * Edita um lançamento em aberto ou liquidado.
 *
 * Faltava, e a única saída era excluir e relançar — perdendo o histórico da
 * parcela e, num parcelado, obrigando a refazer a série inteira.
 *
 * Não mexe no parcelamento: `totalParcelas`/`numeroParcela` definem a série, e
 * alterá-los numa parcela isolada faria a soma das parcelas parar de fechar com o
 * total. `valorTotal` só acompanha quando é parcela única, onde total e parcela
 * são o mesmo número.
 */
export async function atualizar(empresaId: string, id: string, dto: AtualizarLancamentoDto) {
  const atual = await garantirLancamentoDaEmpresa(empresaId, id);

  if (dto.contaId) await garantirContaDaEmpresa(empresaId, dto.contaId);
  if (dto.loteId) await garantirLoteDaEmpresa(empresaId, dto.loteId);
  if (dto.contatoId) await garantirContatoDaEmpresa(empresaId, dto.contatoId);
  if (dto.contaBancariaId) await garantirContaBancariaDaEmpresa(empresaId, dto.contaBancariaId);

  const parcelaUnica = atual.totalParcelas === 1;

  const atualizado = await prisma.lancamento.update({
    where: { id },
    data: {
      contaId: dto.contaId,
      loteId: dto.loteId,
      contatoId: dto.contatoId,
      contaBancariaId: dto.contaBancariaId,
      formaPagamento: dto.formaPagamento,
      descricao: dto.descricao,
      documento: dto.documento,
      valorParcela: dto.valorParcela,
      ...(dto.valorParcela != null && parcelaUnica ? { valorTotal: dto.valorParcela } : {}),
      dataDocumento: dto.dataDocumento ? new Date(dto.dataDocumento) : undefined,
      dataVencimento: dto.dataVencimento ? new Date(dto.dataVencimento) : undefined,
    },
    include: { conta: true },
  });

  return {
    ...atualizado,
    /**
     * Avisa quando o valor de uma parcela de série foi alterado: a soma das
     * parcelas deixa de fechar com `valorTotal`, e é melhor dizer isso do que
     * deixar a divergência aparecer num relatório depois.
     */
    aviso: dto.valorParcela != null && !parcelaUnica
      ? `Esta é a parcela ${atual.numeroParcela} de ${atual.totalParcelas}. O valor total do lançamento continua ${Number(atual.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — confira as outras parcelas se quis mudar o valor de todas.`
      : null,
  };
}

/**
 * Desfaz a liquidação — o estorno que faltava.
 *
 * Liquidar errado (data errada, banco errado, parcela errada) só tinha saída
 * excluindo a parcela. Agora volta pra "em aberto", e o dinheiro sai do saldo do
 * banco na mesma hora, porque o saldo conta só o liquidado.
 */
export async function estornarLiquidacao(empresaId: string, id: string) {
  const lancamento = await garantirLancamentoDaEmpresa(empresaId, id);
  if (!lancamento.dataLiquidacao) {
    throw new BadRequestException(['Este lançamento já está em aberto — não há liquidação a estornar.']);
  }
  const estornado = await prisma.lancamento.update({
    where: { id },
    data: { dataLiquidacao: null },
  });
  return {
    ...estornado,
    liquidacaoEstornada: lancamento.dataLiquidacao.toISOString().slice(0, 10),
    valorParcela: Number(estornado.valorParcela),
  };
}

export async function remover(empresaId: string, id: string) {
  const lancamento = await garantirLancamentoDaEmpresa(empresaId, id);
  await prisma.lancamento.delete({ where: { id } });
  // Descrição e valor voltam pra trilha de atividades poder dizer qual
  // lançamento saiu — depois do delete não há mais como descobrir.
  return {
    ok: true,
    lancamento: {
      descricao: lancamento.descricao,
      valorParcela: Number(lancamento.valorParcela),
      numeroParcela: lancamento.numeroParcela,
      totalParcelas: lancamento.totalParcelas,
    },
  };
}
