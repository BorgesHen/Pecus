/**
 * Custo de aquisição de um lote, do jeito que o produtor já calcula na
 * planilha antes de fechar a compra.
 *
 * A compra do gado é feita quase às cegas: o peso médio é estimado, e o que
 * define se o negócio vale a pena não é o preço por kg negociado, mas o custo
 * real por cabeça depois de somar frete e comissão. A fórmula é a mesma da
 * planilha do produtor:
 *
 *     VALOR CABEÇA = (VALOR KG × PM COMPRA) + FRETE + COMISSÃO
 *
 * Frete e comissão entram **já rateados por cabeça** — é assim que a planilha
 * guarda, e é o que permite somar direto no custo de uma cabeça.
 */

export interface DadosCompraLote {
  /** Peso médio estimado por cabeça na compra (kg). */
  pesoMedioCompra: number;
  /** Preço por kg vivo negociado (R$). */
  valorKgCompra: number;
  /** Frete rateado por cabeça (R$). */
  fretePorCabeca: number;
  /** Comissão rateada por cabeça (R$). */
  comissaoPorCabeca: number;
  /** Cabeças do lote — multiplica o custo unitário pro total do negócio. */
  quantidadeAnimais: number;
}

export interface ResumoCompraLote {
  /** (valorKg × peso) — só o gado, sem frete nem comissão. */
  custoAnimalPorCabeca: number;
  /** Frete + comissão por cabeça. */
  custoAcessorioPorCabeca: number;
  /** VALOR CABEÇA da planilha. */
  custoPorCabeca: number;
  /** O que sai do bolso pelo lote inteiro. */
  custoTotal: number;
  /** Peso vivo total do lote (kg). */
  pesoTotal: number;
  /**
   * Custo por kg vivo já com frete e comissão. É o número que responde "vale a
   * pena?": compara direto com o preço por kg praticado no mercado.
   */
  custoRealPorKg: number;
  /** Quanto frete + comissão encarecem cada kg em relação ao valor negociado. */
  acrescimoPorKg: number;
}

/** Arredonda pra centavos, evitando o arrastar de casas do ponto flutuante. */
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function calcularCompraLote(dados: DadosCompraLote): ResumoCompraLote {
  const peso = Math.max(0, dados.pesoMedioCompra || 0);
  const valorKg = Math.max(0, dados.valorKgCompra || 0);
  const frete = Math.max(0, dados.fretePorCabeca || 0);
  const comissao = Math.max(0, dados.comissaoPorCabeca || 0);
  const cabecas = Math.max(0, Math.trunc(dados.quantidadeAnimais || 0));

  const custoAnimalPorCabeca = peso * valorKg;
  const custoAcessorioPorCabeca = frete + comissao;
  const custoPorCabeca = custoAnimalPorCabeca + custoAcessorioPorCabeca;

  // Sem peso não existe custo por kg — devolve 0 em vez de dividir por zero
  // (é o #DIV/0! que aparece nas linhas em branco da planilha).
  const custoRealPorKg = peso > 0 ? custoPorCabeca / peso : 0;

  return {
    custoAnimalPorCabeca: centavos(custoAnimalPorCabeca),
    custoAcessorioPorCabeca: centavos(custoAcessorioPorCabeca),
    custoPorCabeca: centavos(custoPorCabeca),
    custoTotal: centavos(custoPorCabeca * cabecas),
    pesoTotal: centavos(peso * cabecas),
    custoRealPorKg: centavos(custoRealPorKg),
    acrescimoPorKg: centavos(peso > 0 ? custoRealPorKg - valorKg : 0),
  };
}

/** Frete/comissão podem ser digitados pelo total do lote; o modelo guarda por cabeça. */
export function ratearPorCabeca(valorTotal: number, quantidadeAnimais: number): number {
  const cabecas = Math.max(0, Math.trunc(quantidadeAnimais || 0));
  if (cabecas === 0) return 0;
  return centavos((valorTotal || 0) / cabecas);
}

/** Um lote só tem custo de compra se peso e valor do kg estiverem preenchidos. */
export function temDadosDeCompra(lote: {
  pesoMedioCompra?: number | null;
  valorKgCompra?: number | null;
}): boolean {
  return (lote.pesoMedioCompra ?? 0) > 0 && (lote.valorKgCompra ?? 0) > 0;
}
