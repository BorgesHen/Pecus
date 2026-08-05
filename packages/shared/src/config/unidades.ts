/**
 * Unidades de medida dos insumos, com conversão dentro da mesma família.
 *
 * O problema que isto resolve: remédio se compra em litro e se aplica em
 * mililitro. Sem conversão, ou o produtor digita "0,005 L" na hora do manejo
 * (que ninguém faz e todo mundo erra a casa decimal), ou o sistema baixa 5 L do
 * estoque quando o certo era 5 ml.
 *
 * `Insumo.unidade` é texto livre no banco desde o começo, e continua sendo: o
 * produtor cadastra "saco", "fardo", "dose" e nada disso cabe num enum. Este
 * módulo interpreta o que dá pra interpretar e admite não conhecer o resto —
 * unidade desconhecida simplesmente não converte, e o lançamento tem que ser
 * feito na mesma unidade do cadastro.
 *
 * Função pura, sem Prisma: é o que permite testar a conversão direto.
 */

export enum FamiliaUnidade {
  MASSA = 'MASSA',
  VOLUME = 'VOLUME',
  CONTAGEM = 'CONTAGEM',
}

export interface DefinicaoUnidade {
  /** Como aparece na tela. */
  rotulo: string;
  familia: FamiliaUnidade;
  /** Quanto vale 1 desta unidade na unidade base da família. */
  fatorParaBase: number;
  /** Escritas alternativas aceitas na normalização (sempre minúsculas, sem acento). */
  apelidos: string[];
}

/**
 * Base de cada família: kg pra massa, L pra volume, un pra contagem. A escolha
 * é a unidade em que o produtor compra — é ela que fica gravada no banco, então
 * mudar a base depois exigiria converter dado histórico.
 */
export const UNIDADE_BASE: Record<FamiliaUnidade, string> = {
  [FamiliaUnidade.MASSA]: 'kg',
  [FamiliaUnidade.VOLUME]: 'L',
  [FamiliaUnidade.CONTAGEM]: 'un',
};

export const UNIDADES: Record<string, DefinicaoUnidade> = {
  kg: { rotulo: 'kg', familia: FamiliaUnidade.MASSA, fatorParaBase: 1, apelidos: ['quilo', 'quilos', 'quilograma', 'quilogramas', 'kgs'] },
  g: { rotulo: 'g', familia: FamiliaUnidade.MASSA, fatorParaBase: 0.001, apelidos: ['grama', 'gramas', 'gr'] },
  mg: { rotulo: 'mg', familia: FamiliaUnidade.MASSA, fatorParaBase: 0.000001, apelidos: ['miligrama', 'miligramas'] },
  t: { rotulo: 't', familia: FamiliaUnidade.MASSA, fatorParaBase: 1000, apelidos: ['tonelada', 'toneladas', 'ton'] },
  L: { rotulo: 'L', familia: FamiliaUnidade.VOLUME, fatorParaBase: 1, apelidos: ['l', 'litro', 'litros', 'lt', 'lts'] },
  ml: { rotulo: 'ml', familia: FamiliaUnidade.VOLUME, fatorParaBase: 0.001, apelidos: ['mililitro', 'mililitros', 'cc'] },
  un: { rotulo: 'un', familia: FamiliaUnidade.CONTAGEM, fatorParaBase: 1, apelidos: ['unidade', 'unidades', 'und', 'uni', 'pc', 'peca', 'pecas'] },
  dose: { rotulo: 'dose', familia: FamiliaUnidade.CONTAGEM, fatorParaBase: 1, apelidos: ['doses'] },
};

/** Sugestões do seletor de unidade no cadastro do insumo — as conhecidas, mais o que o produtor já usa. */
export const UNIDADES_SUGERIDAS = ['kg', 'g', 'L', 'ml', 'un', 'dose', 'saco', 'fardo'];

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Descobre qual unidade conhecida corresponde ao texto digitado. Devolve a
 * chave de `UNIDADES` ou null quando não reconhece.
 *
 * Compara sem caixa e sem acento, o que resolve o caso que mais importa aqui:
 * "L" e "ml" se distinguem pela letra "m", não pela caixa, então "l", "L" e
 * "Litros" caem todos em litro, e "ml", "ML" e "cc" caem em mililitro. Confundir
 * os dois erraria o estoque por mil vezes.
 */
export function normalizarUnidade(bruta: string | null | undefined): string | null {
  if (!bruta) return null;
  const limpa = semAcento(String(bruta).trim().toLowerCase());
  if (!limpa) return null;

  for (const [chave, definicao] of Object.entries(UNIDADES)) {
    if (limpa === semAcento(chave.toLowerCase())) return chave;
    if (definicao.apelidos.includes(limpa)) return chave;
  }
  return null;
}

/** Família da unidade digitada, ou null se ela não é conhecida. */
export function familiaDaUnidade(bruta: string | null | undefined): FamiliaUnidade | null {
  const chave = normalizarUnidade(bruta);
  return chave ? UNIDADES[chave].familia : null;
}

/**
 * Unidades em que dá pra lançar um consumo, dado o cadastro do insumo.
 *
 * Insumo em L aceita L e ml; insumo em "saco" só aceita "saco" — não existe
 * fator de conversão inventável pra saco (varia de 20 a 60 kg).
 */
export function unidadesDeUso(unidadeDoInsumo: string | null | undefined): string[] {
  const chave = normalizarUnidade(unidadeDoInsumo);
  if (!chave) return unidadeDoInsumo ? [String(unidadeDoInsumo).trim()] : [];
  const familia = UNIDADES[chave].familia;
  return Object.entries(UNIDADES)
    .filter(([, definicao]) => definicao.familia === familia)
    // Da maior pra menor, que é a ordem em que o produtor pensa (kg antes de g).
    .sort((a, b) => b[1].fatorParaBase - a[1].fatorParaBase)
    .map(([outraChave]) => outraChave);
}

/**
 * Converte entre unidades da mesma família. Devolve null quando não dá:
 * unidade desconhecida, ou famílias diferentes (ml não vira kg — a densidade do
 * produto é que diria, e ela não está cadastrada).
 */
export function converterUnidade(
  quantidade: number,
  de: string | null | undefined,
  para: string | null | undefined,
): number | null {
  const chaveDe = normalizarUnidade(de);
  const chavePara = normalizarUnidade(para);

  // Mesma unidade escrita de qualquer jeito ("Saco" e "saco") não precisa de
  // registro pra converter: o fator é 1.
  if (!chaveDe || !chavePara) {
    const iguais =
      de != null && para != null && semAcento(String(de).trim().toLowerCase()) === semAcento(String(para).trim().toLowerCase());
    return iguais ? quantidade : null;
  }

  const origem = UNIDADES[chaveDe];
  const destino = UNIDADES[chavePara];
  if (origem.familia !== destino.familia) return null;

  return (quantidade * origem.fatorParaBase) / destino.fatorParaBase;
}

/**
 * Quantidade formatada em pt-BR sem zeros à direita.
 *
 * Até 6 casas porque 5 ml de um insumo cadastrado em litro é 0,005 — arredondar
 * em 2 casas mostraria "0" pro produtor e faria parecer que nada foi baixado.
 */
export function formatarQuantidade(quantidade: number, unidade?: string | null): string {
  const numero = quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
  return unidade ? `${numero} ${unidade}` : numero;
}

/**
 * Escolhe a unidade mais legível da família pra exibir uma quantidade pequena:
 * 0,005 L é ruim de ler, 5 ml não. Só desce de unidade quando o número fica
 * abaixo de 1 — acima disso a unidade de cadastro é a que o produtor espera.
 */
export function quantidadeLegivel(
  quantidadeNaBase: number,
  unidadeDoInsumo: string | null | undefined,
): { quantidade: number; unidade: string } {
  const chave = normalizarUnidade(unidadeDoInsumo);
  const original = { quantidade: quantidadeNaBase, unidade: chave ?? String(unidadeDoInsumo ?? '').trim() };
  if (!chave || quantidadeNaBase === 0 || Math.abs(quantidadeNaBase) >= 1) return original;

  const candidatas = unidadesDeUso(chave)
    .map((outra) => ({ chave: outra, fator: UNIDADES[outra].fatorParaBase }))
    .filter((c) => c.fator < UNIDADES[chave].fatorParaBase)
    .sort((a, b) => b.fator - a.fator);

  for (const candidata of candidatas) {
    const convertida = converterUnidade(quantidadeNaBase, chave, candidata.chave);
    if (convertida != null && Math.abs(convertida) >= 1) {
      return { quantidade: convertida, unidade: candidata.chave };
    }
  }
  return original;
}
