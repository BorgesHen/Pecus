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
 * Reais com casas extras quando o valor é menor que um centavo.
 *
 * A dose de um animal pode custar R$ 0,0024 (0,2 ml de um produto de R$ 12,00/L).
 * Em centavos isso aparece como "R$ 0,00", que o produtor lê como "não custou
 * nada" — quando o certo é "custou pouco". Acima de um centavo continua em
 * centavos, que é como dinheiro se lê.
 */
export const brlValor = (valor: number) => {
  if (valor !== 0 && Math.abs(valor) < 0.005) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }
  return brl(valor);
};

/**
 * Valor em reais que pode não existir. Nulo vira travessão, não "R$ 0,00":
 * insumo sem custo de compra é "não se sabe", e zero diria "não vale nada".
 */
export const brlOuTraco = (valor: number | null | undefined) => (valor == null ? '—' : brlValor(valor));

/**
 * Preço por unidade com mais casas que o centavo. R$ 1.000,00/L dá R$ 1,00/ml,
 * mas R$ 30,00/L dá R$ 0,03/ml — e R$ 12,50/L dá R$ 0,0125/ml, que arredondado em
 * centavos apareceria como R$ 0,01 e erraria 25% pra baixo.
 */
export const brlUnitario = (valor: number, unidade: string) =>
  `${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })}/${unidade}`;
