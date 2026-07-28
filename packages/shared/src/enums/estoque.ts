export enum TipoMovimentoInsumo {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
}

export const LABEL_TIPO_MOVIMENTO_INSUMO: Record<TipoMovimentoInsumo, string> = {
  [TipoMovimentoInsumo.ENTRADA]: 'Entrada',
  [TipoMovimentoInsumo.SAIDA]: 'Saída',
};
