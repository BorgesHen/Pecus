import { NaturezaFinanceira } from '@pecus/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

/**
 * O que conta como despesa — o ponto único depois da unificação.
 *
 * `Gasto` e `Lancamento` eram duas tabelas para o mesmo fato e nenhuma via a
 * outra: o custo do lote lia só `Gasto`, o financeiro lia só `Lancamento`. Agora
 * existe uma tabela, e este arquivo é o único lugar que decide o que dela é
 * despesa de custo. Se a regra ficasse copiada em relatórios e no custo do
 * animal, as duas cópias divergiriam no primeiro ajuste.
 *
 * Duas decisões de contabilidade que valem explicação:
 *
 * 1. **Competência, não caixa.** O custo usa `dataDocumento` e conta o lançamento
 *    esteja ele pago ou não: ração comprada a prazo já é custo do lote no dia da
 *    compra. Quem usa `dataLiquidacao` é o fluxo de caixa e o saldo do banco, que
 *    perguntam outra coisa ("quanto dinheiro entrou e saiu").
 *
 * 2. **Compra de insumo não é custo no dia da compra** — é estoque. Vira custo
 *    quando é consumido: como consumo atribuído ao lote (ração, sal) ou aplicado
 *    num animal (remédio). Por isso os lançamentos com `insumoId` saem do rateio
 *    e são devolvidos em separado. Sem essa separação, o frasco de remédio
 *    apareceria rateado entre todas as cabeças E de novo na que tomou a dose.
 */

/** Lançamento de despesa, no formato que os cálculos de custo consomem. */
export interface DespesaParaCusto {
  id: string;
  loteId: string | null;
  valor: number;
  /** Preenchido = compra de insumo (estoque), fica fora do rateio. */
  insumoId: string | null;
  contaId: string;
  /** Nome da conta — é o rótulo que a tela de gastos e o dashboard mostram. */
  conta: string;
  data: Date;
  descricao: string | null;
  /** Quantidade comprada e unidade — é o que abastece o estoque e a conversão alimentar. */
  quantidade: number | null;
  unidade: string | null;
  /** Nulo = ainda em aberto. Não afeta o custo; afeta o caixa. */
  dataLiquidacao: Date | null;
}

/** Filtro base: só despesa (a natureza vem do grupo do plano de contas). */
export function apenasDespesa(empresaId: string): Prisma.LancamentoWhereInput {
  return { empresaId, conta: { grupo: { natureza: NaturezaFinanceira.DESPESA } } };
}

const SELECT_DESPESA = {
  id: true,
  loteId: true,
  valorParcela: true,
  insumoId: true,
  contaId: true,
  dataDocumento: true,
  dataLiquidacao: true,
  descricao: true,
  quantidade: true,
  unidade: true,
  conta: { select: { nome: true, codigo: true } },
} satisfies Prisma.LancamentoSelect;

type LinhaDespesa = Prisma.LancamentoGetPayload<{ select: typeof SELECT_DESPESA }>;

/**
 * Usa `valorParcela`, e não `valorTotal`: num lançamento parcelado cada parcela é
 * uma linha, e somar o total em cada uma multiplicaria a despesa pelo número de
 * parcelas.
 */
function paraCusto(linha: LinhaDespesa): DespesaParaCusto {
  return {
    id: linha.id,
    loteId: linha.loteId,
    valor: Number(linha.valorParcela),
    insumoId: linha.insumoId,
    contaId: linha.contaId,
    conta: linha.conta.nome,
    data: linha.dataDocumento,
    descricao: linha.descricao,
    quantidade: linha.quantidade,
    unidade: linha.unidade,
    dataLiquidacao: linha.dataLiquidacao,
  };
}

/** Despesas da fazenda, opcionalmente de um lote só. */
export async function listarDespesas(
  empresaId: string,
  filtros: { loteId?: string } = {},
): Promise<DespesaParaCusto[]> {
  const linhas = await prisma.lancamento.findMany({
    where: { ...apenasDespesa(empresaId), ...(filtros.loteId ? { loteId: filtros.loteId } : {}) },
    select: SELECT_DESPESA,
    orderBy: { dataDocumento: 'desc' },
  });
  return linhas.map(paraCusto);
}

/** Despesas de vários lotes numa consulta só — evita N+1 na tela que lista o lote inteiro. */
export async function despesasDeLotes(
  empresaId: string,
  loteIds: string[],
): Promise<Map<string, DespesaParaCusto[]>> {
  const porLote = new Map<string, DespesaParaCusto[]>();
  if (loteIds.length === 0) return porLote;

  const linhas = await prisma.lancamento.findMany({
    where: { ...apenasDespesa(empresaId), loteId: { in: loteIds } },
    select: SELECT_DESPESA,
  });

  for (const linha of linhas) {
    const despesa = paraCusto(linha);
    const lista = porLote.get(despesa.loteId!) ?? [];
    lista.push(despesa);
    porLote.set(despesa.loteId!, lista);
  }
  for (const id of loteIds) if (!porLote.has(id)) porLote.set(id, []);
  return porLote;
}

/** Total de despesa por conta do plano — o que o dashboard mostra como "gasto por categoria". */
export async function totalPorConta(empresaId: string, loteId?: string) {
  const agrupado = await prisma.lancamento.groupBy({
    by: ['contaId'],
    where: { ...apenasDespesa(empresaId), ...(loteId ? { loteId } : {}) },
    _sum: { valorParcela: true },
  });
  if (agrupado.length === 0) return [];

  const contas = await prisma.contaFinanceira.findMany({
    where: { id: { in: agrupado.map((a) => a.contaId) } },
    select: { id: true, nome: true, codigo: true, grupo: { select: { nome: true, codigo: true } } },
  });
  const porId = new Map(contas.map((c) => [c.id, c]));

  return agrupado
    .map((linha) => {
      const conta = porId.get(linha.contaId);
      return {
        contaId: linha.contaId,
        // `categoria` no nome pra tela de gastos e dashboard não precisarem mudar
        // de vocabulário: pra quem lança, a conta é a categoria.
        categoria: conta?.nome ?? '—',
        codigo: conta?.codigo ?? '',
        grupo: conta?.grupo.nome ?? '—',
        total: Number(linha._sum.valorParcela ?? 0),
      };
    })
    .sort((a, b) => b.total - a.total);
}
