export enum TipoEventoSanitario {
  VACINA = 'VACINA',
  MEDICAMENTO = 'MEDICAMENTO',
  EXAME = 'EXAME',
  OUTRO = 'OUTRO',
}

export const LABEL_TIPO_EVENTO_SANITARIO: Record<TipoEventoSanitario, string> = {
  [TipoEventoSanitario.VACINA]: 'Vacina',
  [TipoEventoSanitario.MEDICAMENTO]: 'Medicamento',
  [TipoEventoSanitario.EXAME]: 'Exame',
  [TipoEventoSanitario.OUTRO]: 'Outro',
};
