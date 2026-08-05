import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  TipoMovimentoInsumo,
  converterUnidade,
  custoMedioInsumo,
  normalizarUnidade,
  unidadesDeUso,
} from '@pecus/shared';
import { prisma } from '../prisma';

/**
 * Valoração do estoque: quanto vale uma unidade de cada insumo, e quanto custa
 * uma quantidade consumida.
 *
 * Método: **custo médio ponderado das entradas** (o que se pagou ÷ o que se
 * comprou). Foi a escolha em vez de FIFO por lote de compra porque não exige
 * controlar saldo por lote — e porque se ajusta sozinho quando o preço muda,
 * sem ninguém precisar reabrir o cadastro do insumo.
 *
 * Recebe `tx` em vez de usar o `prisma` global nas funções de escrita: a baixa
 * de estoque de uma aplicação sanitária tem que acontecer na mesma transação do
 * evento, senão dá pra sobrar baixa sem evento (ou evento sem baixa).
 */

export interface CustoUnitarioInsumo {
  /** R$ por unidade de cadastro do insumo. Nulo = nenhuma entrada com valor. */
  custoUnitario: number | null;
  /** Quanto do que entrou tinha valor — a base da média. */
  quantidadeValorada: number;
  /** Total pago nas entradas valoradas. */
  valorTotal: number;
}

const SEM_CUSTO: CustoUnitarioInsumo = { custoUnitario: null, quantidadeValorada: 0, valorTotal: 0 };

/**
 * Custo médio de vários insumos de uma vez.
 *
 * Uma consulta só pra todas as entradas, agrupada em memória — calcular insumo
 * por insumo seria um N+1 na tela de estoque, que lista todos.
 */
export async function custoMedioDe(
  insumoIds: string[],
  cliente: Prisma.TransactionClient = prisma,
): Promise<Map<string, CustoUnitarioInsumo>> {
  const resultado = new Map<string, CustoUnitarioInsumo>();
  if (insumoIds.length === 0) return resultado;

  const entradas = await cliente.movimentoInsumo.findMany({
    where: { insumoId: { in: insumoIds }, tipo: TipoMovimentoInsumo.ENTRADA },
    select: { insumoId: true, quantidade: true, valorTotal: true },
  });

  const porInsumo = new Map<string, { quantidade: number; valorTotal: number | null }[]>();
  for (const entrada of entradas) {
    const lista = porInsumo.get(entrada.insumoId) ?? [];
    lista.push({ quantidade: entrada.quantidade, valorTotal: entrada.valorTotal == null ? null : Number(entrada.valorTotal) });
    porInsumo.set(entrada.insumoId, lista);
  }

  for (const id of insumoIds) {
    const lista = porInsumo.get(id);
    resultado.set(id, lista ? custoMedioInsumo(lista) : SEM_CUSTO);
  }
  return resultado;
}

export async function custoMedio(
  insumoId: string,
  cliente: Prisma.TransactionClient = prisma,
): Promise<CustoUnitarioInsumo> {
  const mapa = await custoMedioDe([insumoId], cliente);
  return mapa.get(insumoId) ?? SEM_CUSTO;
}

/** Saldo em estoque (entradas − saídas), na unidade de cadastro do insumo. */
export async function saldoDe(
  insumoIds: string[],
  cliente: Prisma.TransactionClient = prisma,
): Promise<Map<string, number>> {
  const saldos = new Map<string, number>();
  if (insumoIds.length === 0) return saldos;

  const totais = await cliente.movimentoInsumo.groupBy({
    by: ['insumoId', 'tipo'],
    where: { insumoId: { in: insumoIds } },
    _sum: { quantidade: true },
  });

  for (const total of totais) {
    const sinal = total.tipo === TipoMovimentoInsumo.ENTRADA ? 1 : -1;
    saldos.set(total.insumoId, (saldos.get(total.insumoId) ?? 0) + sinal * (total._sum.quantidade ?? 0));
  }
  for (const id of insumoIds) if (!saldos.has(id)) saldos.set(id, 0);
  return saldos;
}

/**
 * Converte a quantidade digitada pela unidade de cadastro do insumo.
 *
 * É aqui que "5 ml de um produto cadastrado em L" vira 0,005 — e é aqui que se
 * recusa o impossível: ml não vira kg (a densidade do produto diria, e ela não
 * está cadastrada), e "saco" não tem fator pra kg (varia de 20 a 60).
 */
export function converterParaUnidadeDoInsumo(
  quantidade: number,
  unidadeInformada: string | null | undefined,
  unidadeDoInsumo: string,
): number {
  // Sem unidade informada, assume que o número já veio na unidade do cadastro —
  // é o comportamento de quem chama sem escolher unidade.
  if (!unidadeInformada) return quantidade;

  const convertida = converterUnidade(quantidade, unidadeInformada, unidadeDoInsumo);
  if (convertida == null) {
    const aceitas = unidadesDeUso(unidadeDoInsumo).join(', ');
    throw new BadRequestException([
      `Não é possível converter ${unidadeInformada} para ${unidadeDoInsumo}. ` +
        `Para este insumo, use: ${aceitas}.`,
    ]);
  }
  return convertida;
}

export interface BaixaDeEstoque {
  movimentoId: string;
  /** Quantidade baixada, na unidade de cadastro do insumo. */
  quantidade: number;
  custoUnitario: number | null;
  /** Custo do que saiu. Nulo quando o insumo não tem valor de compra conhecido. */
  valorTotal: number | null;
  saldoAntes: number;
  saldoDepois: number;
  /** Preenchido quando a baixa deixou o saldo negativo — a tela avisa. */
  aviso?: string;
}

/**
 * Dá baixa no estoque e devolve quanto isso custou.
 *
 * Não bloqueia saldo negativo: o manejo já aconteceu no brete, e recusar o
 * registro por causa do estoque só produziria manejo não registrado (que é pior
 * que estoque negativo). Devolve o aviso pra a tela mostrar — e é o mesmo
 * critério da resposta sobre insumo sem custo: registra e avisa.
 */
export async function baixarEstoque(
  tx: Prisma.TransactionClient,
  dados: {
    empresaId: string;
    insumoId: string;
    unidadeDoInsumo: string;
    nomeDoInsumo: string;
    quantidade: number;
    unidadeInformada?: string | null;
    data: Date;
    observacao?: string;
  },
): Promise<BaixaDeEstoque> {
  const quantidade = converterParaUnidadeDoInsumo(dados.quantidade, dados.unidadeInformada, dados.unidadeDoInsumo);
  if (!(quantidade > 0)) {
    throw new BadRequestException(['A quantidade consumida precisa ser maior que zero.']);
  }

  const [{ custoUnitario }, saldos] = await Promise.all([
    custoMedio(dados.insumoId, tx),
    saldoDe([dados.insumoId], tx),
  ]);
  const saldoAntes = saldos.get(dados.insumoId) ?? 0;
  const saldoDepois = saldoAntes - quantidade;

  // Centavos: o custo do que saiu é dinheiro, e Decimal(12,2) no banco truncaria
  // de qualquer jeito — melhor arredondar aqui, onde dá pra explicar.
  const valorTotal = custoUnitario == null ? null : Math.round(custoUnitario * quantidade * 100) / 100;

  const movimento = await tx.movimentoInsumo.create({
    data: {
      empresaId: dados.empresaId,
      insumoId: dados.insumoId,
      tipo: TipoMovimentoInsumo.SAIDA,
      quantidade,
      valorTotal,
      data: dados.data,
      observacao: dados.observacao,
    },
  });

  return {
    movimentoId: movimento.id,
    quantidade,
    custoUnitario,
    valorTotal,
    saldoAntes,
    saldoDepois,
    aviso:
      saldoDepois < 0
        ? `O estoque de "${dados.nomeDoInsumo}" ficou negativo (${saldoDepois.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} ${dados.unidadeDoInsumo}). Confira as entradas.`
        : custoUnitario == null
          ? `"${dados.nomeDoInsumo}" não tem valor de compra registrado, então o custo desta aplicação ficou em branco.`
          : undefined,
  };
}

/** Insumo da empresa, com o que a baixa de estoque precisa saber sobre ele. */
export async function obterInsumoParaConsumo(
  tx: Prisma.TransactionClient,
  empresaId: string,
  insumoId: string,
) {
  const insumo = await tx.insumo.findFirst({
    where: { id: insumoId, empresaId },
    select: { id: true, nome: true, unidade: true },
  });
  if (!insumo) throw new BadRequestException(['Insumo não encontrado nesta fazenda.']);
  return insumo;
}

/** Unidades aceitas no lançamento de consumo de um insumo — a tela monta o seletor com isto. */
export function unidadesAceitas(unidadeDoInsumo: string): string[] {
  const conhecida = normalizarUnidade(unidadeDoInsumo);
  return conhecida ? unidadesDeUso(conhecida) : [unidadeDoInsumo];
}
