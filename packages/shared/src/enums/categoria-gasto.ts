/**
 * Categorias de gasto sugeridas. Também serve como base para agrupamento
 * em relatórios (custo por arroba, custo por lote, etc.).
 */
export enum CategoriaGasto {
  RACAO = 'Ração',
  SUPLEMENTO = 'Suplemento mineral',
  INSUMO_PASTO = 'Insumo de pasto (semente, fertilizante, defensivo)',
  COMBUSTIVEL = 'Combustível',
  MANUTENCAO = 'Manutenção (máquinas, cercas, óleo de motor)',
  SANIDADE = 'Sanidade (vacinas, medicamentos)',
  MAO_DE_OBRA = 'Mão de obra',
  AQUISICAO_ANIMAIS = 'Aquisição de animais',
  OUTROS = 'Outros',
}
