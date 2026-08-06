import { EspecieAnimal, ESPECIE_CONFIG } from '../enums/animal';

/**
 * Rendimento de carcaça — o número que só existe **depois** do abate.
 *
 * Cuidado com a homonímia: `Lote.rendimentoCarcaca` é uma **estimativa** usada
 * antes do abate para projetar arrobas e custo por arroba. O que está aqui é o
 * **realizado**, medido no frigorífico. São dois números e vivem em lugares
 * diferentes de propósito: se o realizado sobrescrevesse a estimativa, some a
 * comparação "estimava 52%, saiu 50,8%" — que é justamente o que ensina a
 * estimar melhor no próximo lote.
 *
 * O que se guarda é o **peso de carcaça em kg**, não o percentual. É o que a nota
 * do frigorífico traz e é sobre o que o dinheiro é pago; o percentual é uma razão
 * derivada, e guardar a razão perderia o kg.
 *
 * Função pura, sem Prisma: quem lê o banco é o service.
 */

/** Uma arroba = 15 kg de carcaça. É a unidade de comercialização do boi. */
export const KG_POR_ARROBA = 15;

/**
 * Faixa plausível de rendimento (%). Fora dela o lançamento é aceito, mas com
 * aviso: rendimento é conta de kg sobre kg, e um erro de digitação (carcaça no
 * lugar do peso vivo, vírgula fora de lugar) sai daqui na hora. Bovino fica
 * tipicamente entre 50 e 56%, ovino entre 43 e 50% — a faixa é larga porque
 * abate de emergência e animal muito magro caem legitimamente fora do típico.
 */
export const RENDIMENTO_MINIMO_PLAUSIVEL = 35;
export const RENDIMENTO_MAXIMO_PLAUSIVEL = 65;

export interface DadosAbateAnimal {
  /** kg de carcaça quente, da nota do frigorífico. Nulo = abate ainda não informado. */
  pesoCarcaca?: number | null;
  /** Peso vivo na balança do frigorífico, quando a nota traz. */
  pesoVivoAbate?: number | null;
  /** Último peso registrado na fazenda (o peso de saída) — a referência de reserva. */
  pesoSaida?: number | null;
  especie: EspecieAnimal;
}

export interface ResultadoAbateAnimal {
  /** kg de carcaça. Nulo = abate não informado. */
  pesoCarcaca: number | null;
  /** % de rendimento. Nulo quando falta a carcaça ou não há peso vivo de referência. */
  rendimento: number | null;
  /** Peso vivo que entrou na divisão. */
  pesoVivo: number | null;
  /**
   * De onde veio o peso vivo. Importa porque o peso da fazenda foi medido ANTES do
   * transporte e é maior — o mesmo animal rende alguns pontos menos quando medido
   * contra ele. A diferença entre os dois pesos é a quebra de transporte (2 a 4%).
   *
   * O cálculo **não estima nem desconta** essa quebra: é carcaça ÷ peso informado,
   * e este campo diz qual peso foi. Aplicar uma quebra estimada faria um número
   * medido virar chute, sem o produtor saber qual dos dois está lendo.
   */
  origemPesoVivo: 'frigorifico' | 'saida' | null;
  /** Arrobas de carcaça entregues. Nulo em espécie que não se vende por arroba (ovino). */
  arrobas: number | null;
  /** Em português, o que impede o cálculo ou o que está estranho no número. */
  aviso?: string;
}

const arredondar = (valor: number, casas = 2) => Number(valor.toFixed(casas));

/**
 * Rendimento e arrobas de um animal abatido.
 *
 * Prefere o peso do frigorífico; sem ele, usa o peso de saída da fazenda. Nunca
 * inventa peso vivo: sem nenhum dos dois, devolve rendimento nulo com o motivo.
 */
export function calcularAbateAnimal(dados: DadosAbateAnimal): ResultadoAbateAnimal {
  const vendePorArroba = ESPECIE_CONFIG[dados.especie].vendePorArroba;
  const carcaca = dados.pesoCarcaca ?? null;

  const vazio: ResultadoAbateAnimal = {
    pesoCarcaca: carcaca,
    rendimento: null,
    pesoVivo: null,
    origemPesoVivo: null,
    arrobas: null,
  };

  if (carcaca == null || !(carcaca > 0)) return vazio;

  const arrobas = vendePorArroba ? arredondar(carcaca / KG_POR_ARROBA) : null;

  const doFrigorifico = dados.pesoVivoAbate != null && dados.pesoVivoAbate > 0;
  const pesoVivo = doFrigorifico ? dados.pesoVivoAbate! : (dados.pesoSaida ?? null);
  if (pesoVivo == null || !(pesoVivo > 0)) {
    return {
      ...vazio,
      pesoCarcaca: carcaca,
      arrobas,
      aviso:
        'Sem peso vivo de referência: registre o peso de saída do animal, ou informe o peso vivo no frigorífico, para calcular o rendimento.',
    };
  }

  const rendimento = arredondar((carcaca / pesoVivo) * 100);
  const origemPesoVivo = doFrigorifico ? ('frigorifico' as const) : ('saida' as const);

  return {
    pesoCarcaca: carcaca,
    rendimento,
    pesoVivo,
    origemPesoVivo,
    arrobas,
    aviso: avisoDeRendimento(rendimento, carcaca, pesoVivo),
  };
}

function avisoDeRendimento(rendimento: number, carcaca: number, pesoVivo: number): string | undefined {
  // Carcaça maior que o peso vivo é impossível — quase sempre é o peso vivo
  // digitado no campo da carcaça, ou vice-versa.
  if (carcaca > pesoVivo) {
    return `A carcaça (${carcaca} kg) está maior que o peso vivo (${pesoVivo} kg). Confira se os dois campos não foram trocados.`;
  }
  if (rendimento < RENDIMENTO_MINIMO_PLAUSIVEL) {
    return `Rendimento de ${rendimento}% está abaixo do usual (mínimo típico ${RENDIMENTO_MINIMO_PLAUSIVEL}%). Confira o peso de carcaça.`;
  }
  if (rendimento > RENDIMENTO_MAXIMO_PLAUSIVEL) {
    return `Rendimento de ${rendimento}% está acima do usual (máximo típico ${RENDIMENTO_MAXIMO_PLAUSIVEL}%). Confira o peso de carcaça.`;
  }
  return undefined;
}

export interface AnimalParaAbateDoLote {
  id: string;
  identificador: string;
  /** ATIVO = ainda não saiu; qualquer outro = saiu do rebanho. */
  status: string;
  pesoCarcaca?: number | null;
  pesoVivoAbate?: number | null;
  /** Último peso registrado (peso de saída). */
  pesoSaida?: number | null;
}

export interface AbateDoLote {
  /** Cabeças cadastradas no lote. */
  cadastrados: number;
  /** Ainda no rebanho. Enquanto for maior que zero o lote não fecha. */
  ativos: number;
  /** Saíram do rebanho (vendidos, mortos, transferidos). */
  abatidos: number;
  /** Dos que saíram, quantos já têm peso de carcaça informado. */
  comCarcaca: number;
  /** Quem saiu e ainda não tem carcaça — é a lista de trabalho pendente. */
  pendentes: { id: string; identificador: string }[];
  pesoCarcacaTotal: number;
  pesoVivoTotal: number;
  /**
   * Rendimento do lote: carcaça total ÷ peso vivo total.
   *
   * **Não é a média dos percentuais dos animais.** A média simples pesaria um
   * animal de 300 kg igual a um de 550, e o resultado não seria o rendimento de
   * nada. Nulo enquanto nenhum animal tiver carcaça informada.
   */
  rendimentoRealizado: number | null;
  arrobasTotais: number | null;
  /** Todos saíram e todos têm carcaça: os números do lote são finais. */
  completo: boolean;
}

export function agregarAbateDoLote(
  animais: AnimalParaAbateDoLote[],
  especie: EspecieAnimal,
): AbateDoLote {
  const ativos = animais.filter((a) => a.status === 'ATIVO');
  const sairam = animais.filter((a) => a.status !== 'ATIVO');

  let pesoCarcacaTotal = 0;
  let pesoVivoTotal = 0;
  const comCarcaca: AnimalParaAbateDoLote[] = [];
  const pendentes: { id: string; identificador: string }[] = [];

  for (const animal of sairam) {
    if (animal.pesoCarcaca != null && animal.pesoCarcaca > 0) {
      const pesoVivo = animal.pesoVivoAbate ?? animal.pesoSaida ?? null;
      comCarcaca.push(animal);
      pesoCarcacaTotal += animal.pesoCarcaca;
      // Só soma no denominador quem tem peso vivo: incluir a carcaça sem o peso
      // vivo correspondente inflaria o rendimento do lote.
      if (pesoVivo != null && pesoVivo > 0) pesoVivoTotal += pesoVivo;
    } else {
      pendentes.push({ id: animal.id, identificador: animal.identificador });
    }
  }

  const vendePorArroba = ESPECIE_CONFIG[especie].vendePorArroba;

  return {
    cadastrados: animais.length,
    ativos: ativos.length,
    abatidos: sairam.length,
    comCarcaca: comCarcaca.length,
    pendentes,
    pesoCarcacaTotal: arredondar(pesoCarcacaTotal),
    pesoVivoTotal: arredondar(pesoVivoTotal),
    rendimentoRealizado:
      pesoVivoTotal > 0 && pesoCarcacaTotal > 0 ? arredondar((pesoCarcacaTotal / pesoVivoTotal) * 100) : null,
    arrobasTotais: vendePorArroba && pesoCarcacaTotal > 0 ? arredondar(pesoCarcacaTotal / KG_POR_ARROBA) : null,
    // "Completo" exige as duas coisas: ninguém no rebanho e ninguém sem carcaça.
    // Só a primeira faria o lote fechar com rendimento pela metade.
    completo: animais.length > 0 && ativos.length === 0 && pendentes.length === 0,
  };
}

/**
 * A **estimativa** de rendimento em vigor para um lote: valor do próprio lote,
 * senão o padrão da fazenda, senão o padrão da espécie.
 *
 * O padrão da fazenda (`rendimentoCarcacaPadrao`) é rotulado como padrão de
 * bovino na tela de Configurações, então só se aplica a bovino — para ovino cai
 * direto no padrão da espécie, que é bem menor (~45% contra ~52%).
 *
 * Estava duplicada em `relatorios.service.ts` e em `abate.service.ts`; ficou aqui
 * porque é a definição de um conceito do negócio, e duas cópias divergiriam no
 * dia em que a regra mudasse.
 */
export function rendimentoEstimadoDoLote(
  rendimentoDoLote: number | null | undefined,
  especie: EspecieAnimal,
  rendimentoPadraoEmpresa?: number | null,
): number {
  if (rendimentoDoLote != null) return rendimentoDoLote;
  if (especie === EspecieAnimal.BOVINO && rendimentoPadraoEmpresa != null) return rendimentoPadraoEmpresa;
  return ESPECIE_CONFIG[especie].rendimentoCarcacaPadrao;
}

/**
 * A data de abate não pode ser anterior à saída do animal: primeiro ele sai da
 * fazenda, depois é abatido. Devolve a mensagem do problema, ou null.
 */
export function validarDataAbate(
  dataSaida: string | Date | null | undefined,
  dataAbate: string | Date,
): string | null {
  if (!dataSaida) return 'Informe primeiro a saída do animal.';
  const saida = (dataSaida instanceof Date ? dataSaida.toISOString() : String(dataSaida)).slice(0, 10);
  const abate = (dataAbate instanceof Date ? dataAbate.toISOString() : String(dataAbate)).slice(0, 10);
  if (abate < saida) return 'A data do abate não pode ser anterior à data de saída do animal.';
  return null;
}
