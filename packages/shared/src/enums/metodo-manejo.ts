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

/**
 * Tipo do método — define qual bloco de fórmulas/indicadores se aplica
 * (ver relatorios.service.ts). Vale tanto para os métodos globais do seed
 * quanto para métodos customizados por empresa.
 */
export enum TipoMetodoManejo {
  EXTENSIVO = 'EXTENSIVO',
  SEMICONFINAMENTO = 'SEMICONFINAMENTO',
  TIP = 'TIP',
  CONFINAMENTO = 'CONFINAMENTO',
  RECRIA = 'RECRIA',
  NAO_DEFINIDO = 'NAO_DEFINIDO',
}

export const LABEL_TIPO_METODO_MANEJO: Record<TipoMetodoManejo, string> = {
  [TipoMetodoManejo.EXTENSIVO]: 'Extensivo (pasto)',
  [TipoMetodoManejo.SEMICONFINAMENTO]: 'Semiconfinamento',
  [TipoMetodoManejo.TIP]: 'TIP — Terminação Intensiva a Pasto',
  [TipoMetodoManejo.CONFINAMENTO]: 'Confinamento',
  [TipoMetodoManejo.RECRIA]: 'Recria',
  [TipoMetodoManejo.NAO_DEFINIDO]: 'Não definido',
};

/** Tipos que ainda dependem de pasto (mostram lotação e ganho por hectare). */
export const TIPOS_METODO_A_PASTO: TipoMetodoManejo[] = [
  TipoMetodoManejo.EXTENSIVO,
  TipoMetodoManejo.SEMICONFINAMENTO,
  TipoMetodoManejo.TIP,
];
