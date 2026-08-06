/**
 * Uma despesa como a tela de Gastos a consome.
 *
 * Não existe mais tabela `Gasto`: Gastos e Financeiro foram unificados em
 * `Lancamento`. Este tipo sobreviveu porque a tela de Gastos continua sendo a
 * entrada rápida de despesa já paga, com o vocabulário dela — "categoria" é o
 * nome da conta do plano, e `valor` é o valor da parcela.
 */
export interface Gasto {
  id: string;
  empresaId: string;
  /** null = despesa geral da fazenda, não atribuída a um lote. */
  loteId?: string | null;
  /** Preenchido = compra de insumo, que dá entrada automática no estoque. */
  insumoId?: string | null;
  /** Nome da conta do plano de contas — "categoria" na linguagem da tela. */
  categoria: string;
  descricao?: string | null;
  valor: number;
  /** Quantidade comprada (litros de combustível, sacos de ração) e sua unidade. */
  quantidade?: number | null;
  unidade?: string | null;
  /** Nulo = lançada pelo Financeiro e ainda não paga. */
  dataLiquidacao?: string | null;
  data: string;
}
