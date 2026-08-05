import type { TipoMovimentoInsumo } from '../enums/estoque';

export interface Insumo {
  id: string;
  empresaId: string;
  nome: string;
  unidade: string;
  estoqueMinimo?: number | null;
  createdAt: string;
}

export interface MovimentoInsumo {
  id: string;
  empresaId: string;
  insumoId: string;
  tipo: TipoMovimentoInsumo;
  /** Sempre na unidade de cadastro do insumo — ver config/unidades.ts. */
  quantidade: number;
  /**
   * Valor em reais do movimento. Na entrada é o que se pagou (base do custo
   * médio); na saída, o custo do que saiu. Nulo = entrada sem valor informado.
   */
  valorTotal?: number | null;
  /** Só em SAÍDA: lote que consumiu — é o que leva o valor pro custo do lote. */
  loteId?: string | null;
  data: string;
  gastoId?: string | null;
  observacao?: string | null;
  createdAt: string;
}
