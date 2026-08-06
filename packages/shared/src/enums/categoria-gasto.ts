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

/**
 * Para qual conta do plano de contas cada categoria de gasto vai.
 *
 * Existe porque Gastos e Financeiro deixaram de ser dois sistemas paralelos: a
 * tela de Gastos continua sendo a entrada rápida (categoria simples, sem plano de
 * contas na frente), mas o que ela grava é um `Lancamento` — então a categoria
 * precisa virar conta. Os códigos são os de PLANO_CONTAS_PADRAO.
 *
 * Categoria que não está aqui (o "Outros" digitado à mão) cai numa conta criada
 * com o nome dela dentro de "Outras Despesas" — o nome não se perde.
 */
export const CONTA_DA_CATEGORIA_GASTO: Record<CategoriaGasto, string> = {
  [CategoriaGasto.RACAO]: '2.1.1',
  [CategoriaGasto.SUPLEMENTO]: '2.1.2',
  [CategoriaGasto.SANIDADE]: '2.1.4',
  [CategoriaGasto.AQUISICAO_ANIMAIS]: '2.1.7',
  // Semente, fertilizante e defensivo são despesa de formação de pasto, que no
  // plano vive em "Despesas com Ocupação".
  [CategoriaGasto.INSUMO_PASTO]: '2.3.3',
  [CategoriaGasto.MAO_DE_OBRA]: '2.5.2',
  [CategoriaGasto.COMBUSTIVEL]: '2.5.3',
  [CategoriaGasto.MANUTENCAO]: '2.8.1',
  [CategoriaGasto.OUTROS]: '2.8.3',
};

/** Grupo que recebe conta criada na hora, pra categoria fora da lista padrão. */
export const GRUPO_OUTRAS_DESPESAS = '2.8';
