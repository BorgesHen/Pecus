/**
 * Métodos de manejo mais comuns. O sistema também permite cadastrar métodos
 * personalizados (tabela MetodoManejo), então isto serve como sugestão/seed
 * inicial, não como lista fechada.
 */
export enum MetodoManejoPadrao {
  TIP = 'TIP - Terminação Intensiva a Pasto',
  CONFINAMENTO = 'Confinamento',
  SEMICONFINAMENTO = 'Semiconfinamento',
  EXTENSIVO = 'Extensivo (pasto)',
  RECRIA = 'Recria',
}
