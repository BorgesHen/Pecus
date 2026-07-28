export enum TipoEventoReprodutivo {
  ESTACAO_MONTA = 'ESTACAO_MONTA',
  INSEMINACAO = 'INSEMINACAO',
  DIAGNOSTICO_GESTACAO = 'DIAGNOSTICO_GESTACAO',
  PARTO = 'PARTO',
  DESMAME = 'DESMAME',
  DESCARTE = 'DESCARTE',
}

export const LABEL_TIPO_EVENTO_REPRODUTIVO: Record<TipoEventoReprodutivo, string> = {
  [TipoEventoReprodutivo.ESTACAO_MONTA]: 'Estação de monta',
  [TipoEventoReprodutivo.INSEMINACAO]: 'Inseminação',
  [TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO]: 'Diagnóstico de gestação',
  [TipoEventoReprodutivo.PARTO]: 'Parto',
  [TipoEventoReprodutivo.DESMAME]: 'Desmame',
  [TipoEventoReprodutivo.DESCARTE]: 'Descarte',
};
