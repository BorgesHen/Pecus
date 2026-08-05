/**
 * Formatação de número pra tela.
 *
 * `brl` já existia como const local em cinco telas (lotes, gastos, financeiro…);
 * ficou aqui quando passou a ser usada também no custo do animal e no estoque.
 * As cópias antigas continuam funcionando — não foram trocadas pra não misturar
 * um refactor de cinco arquivos com a mudança de funcionalidade.
 */

export const brl = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Valor em reais que pode não existir. Nulo vira travessão, não "R$ 0,00":
 * insumo sem custo de compra é "não se sabe", e zero diria "não vale nada".
 */
export const brlOuTraco = (valor: number | null | undefined) => (valor == null ? '—' : brl(valor));

/**
 * Preço por unidade com mais casas que o centavo. R$ 1.000,00/L dá R$ 1,00/ml,
 * mas R$ 30,00/L dá R$ 0,03/ml — e R$ 12,50/L dá R$ 0,0125/ml, que arredondado em
 * centavos apareceria como R$ 0,01 e erraria 25% pra baixo.
 */
export const brlUnitario = (valor: number, unidade: string) =>
  `${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })}/${unidade}`;
