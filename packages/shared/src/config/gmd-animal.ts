/**
 * GMD (Ganho Médio Diário) de um animal individual.
 *
 * Mesma ideia do GMD do lote (relatorios/pesagens), mas do bicho: em vez da
 * média do lote, usa o peso de entrada e o histórico de pesagens daquele
 * animal. Enquanto ele está ativo o número é uma **prévia** — muda a cada nova
 * pesagem. Quando o animal sai, a última pesagem é o peso de saída e o GMD
 * deixa de se mover.
 *
 * Tudo aqui é função pura, sem Prisma e sem fuso: as datas entram e saem como
 * "AAAA-MM-DD". Isso é o que permite testar a fórmula direto.
 */

/** Teto de sanidade pro peso digitado (kg). Bovino adulto grande ~1.200 kg. */
export const PESO_MAXIMO_KG = 2000;

export interface PesagemParaGmd {
  id?: string;
  data: string | Date;
  peso: number;
}

export interface AnimalParaGmd {
  dataEntrada: string | Date;
  pesoEntrada?: number | null;
  /** Preenchido = animal já saiu, então o GMD é final e não prévia. */
  dataSaida?: string | Date | null;
}

export interface PontoPeso {
  data: string;
  peso: number;
  /** Veio do peso de entrada do animal, não de uma pesagem. */
  ehEntrada: boolean;
  pesagemId?: string;
  /** Ganho por dia desde o ponto anterior. Nulo no primeiro ponto. */
  gmdDoPeriodo: number | null;
  diasDoPeriodo: number | null;
  ganhoDoPeriodo: number | null;
}

export interface ResultadoGmdAnimal {
  /** kg/dia entre o primeiro e o último ponto. Nulo = não deu pra calcular. */
  gmd: number | null;
  pesoInicial: number | null;
  dataInicial: string | null;
  pesoFinal: number | null;
  dataFinal: string | null;
  dias: number | null;
  ganhoTotal: number | null;
  /** O número ainda vai mudar (animal ativo). */
  previa: boolean;
  /** Por que não deu pra calcular, em português, pra mostrar na tela. */
  mensagem?: string;
  /** Entrada + pesagens em ordem crescente, cada uma com o GMD do período. */
  pontos: PontoPeso[];
}

/** Normaliza pra "AAAA-MM-DD": o dia é o que importa, hora nunca entra na conta. */
function diaISO(valor: string | Date): string {
  return (valor instanceof Date ? valor.toISOString() : String(valor)).slice(0, 10);
}

/**
 * Dias entre dois dias ISO.
 *
 * Ancorado ao meio-dia UTC porque à meia-noite a diferença pode dar 0,96 ou
 * 1,04 dia quando o horário de verão entra no meio do intervalo — e aí o
 * arredondamento erra o dia.
 */
function diasEntre(de: string, ate: string): number {
  const ms = Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const arredondar = (valor: number, casas = 3) => Number(valor.toFixed(casas));

/**
 * Monta a linha do tempo do peso: entrada (se houver peso de entrada) + as
 * pesagens, em ordem, cada ponto com o ganho por dia desde o anterior.
 *
 * O GMD por período é o que mostra se o ganho acelerou ou caiu — a média geral
 * esconde isso. Duas pesagens no mesmo dia deixam o período nulo em vez de
 * dividir por zero.
 */
function montarPontos(animal: AnimalParaGmd, pesagens: PesagemParaGmd[]): PontoPeso[] {
  const ordenadas = [...pesagens].sort((a, b) => diaISO(a.data).localeCompare(diaISO(b.data)));

  const brutos: Omit<PontoPeso, 'gmdDoPeriodo' | 'diasDoPeriodo' | 'ganhoDoPeriodo'>[] = [];
  if (animal.pesoEntrada != null) {
    brutos.push({ data: diaISO(animal.dataEntrada), peso: animal.pesoEntrada, ehEntrada: true });
  }
  for (const pesagem of ordenadas) {
    brutos.push({ data: diaISO(pesagem.data), peso: pesagem.peso, ehEntrada: false, pesagemId: pesagem.id });
  }

  return brutos.map((ponto, indice) => {
    const anterior = brutos[indice - 1];
    if (!anterior) {
      return { ...ponto, gmdDoPeriodo: null, diasDoPeriodo: null, ganhoDoPeriodo: null };
    }
    const dias = diasEntre(anterior.data, ponto.data);
    const ganho = arredondar(ponto.peso - anterior.peso, 2);
    return {
      ...ponto,
      diasDoPeriodo: dias,
      ganhoDoPeriodo: ganho,
      gmdDoPeriodo: dias > 0 ? arredondar(ganho / dias) : null,
    };
  });
}

/**
 * GMD do animal entre o primeiro e o último peso conhecido.
 *
 * Precisa de dois pontos em dias diferentes. Sem peso de entrada, a primeira
 * pesagem passa a ser o ponto de partida — mesma regra do GMD do lote, que usa
 * a primeira pesagem quando o lote não tem peso médio de entrada.
 */
export function calcularGmdAnimal(
  animal: AnimalParaGmd,
  pesagens: PesagemParaGmd[] = [],
): ResultadoGmdAnimal {
  const pontos = montarPontos(animal, pesagens);
  const previa = !animal.dataSaida;

  const vazio = (mensagem: string): ResultadoGmdAnimal => ({
    gmd: null,
    pesoInicial: pontos[0]?.peso ?? null,
    dataInicial: pontos[0]?.data ?? null,
    pesoFinal: null,
    dataFinal: null,
    dias: null,
    ganhoTotal: null,
    previa,
    mensagem,
    pontos,
  });

  if (pontos.length === 0) {
    return vazio('Informe o peso de entrada ou registre uma pesagem para acompanhar o ganho.');
  }
  if (pontos.length === 1) {
    return vazio(
      animal.pesoEntrada != null
        ? 'Registre uma pesagem para calcular o ganho médio diário.'
        : 'Registre outra pesagem (ou informe o peso de entrada) para calcular o ganho médio diário.',
    );
  }

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const dias = diasEntre(primeiro.data, ultimo.data);

  // Tudo no mesmo dia não é ganho nenhum: seria dividir por zero. O GMD do
  // lote usa max(1, dias) nesse caso, o que transforma o ganho inteiro em
  // ganho de um dia — aqui prefiro dizer que ainda não dá pra calcular.
  if (dias <= 0) {
    return vazio('As pesagens são do mesmo dia da entrada — o ganho aparece a partir do dia seguinte.');
  }

  const ganhoTotal = arredondar(ultimo.peso - primeiro.peso, 2);

  return {
    gmd: arredondar(ganhoTotal / dias),
    pesoInicial: primeiro.peso,
    dataInicial: primeiro.data,
    pesoFinal: ultimo.peso,
    dataFinal: ultimo.data,
    dias,
    ganhoTotal,
    previa,
    pontos,
  };
}

/**
 * Peso atual do animal: a última pesagem ou, se não houver nenhuma, o peso de
 * entrada. Depois da saída, é o peso de saída.
 */
export function pesoAtualDoAnimal(
  animal: AnimalParaGmd,
  pesagens: PesagemParaGmd[] = [],
): { peso: number; data: string; ehEntrada: boolean } | null {
  const pontos = montarPontos(animal, pesagens);
  const ultimo = pontos[pontos.length - 1];
  if (!ultimo) return null;
  return { peso: ultimo.peso, data: ultimo.data, ehEntrada: ultimo.ehEntrada };
}

/**
 * Valida a data de uma pesagem contra a vida do animal. Devolve a mensagem do
 * problema, ou null se estiver tudo bem.
 *
 * Pesagem antes da entrada ou depois da saída não é registro, é erro de
 * digitação — e uma data errada desloca o GMD sem deixar pista.
 */
export function validarDataPesagem(animal: AnimalParaGmd, data: string | Date): string | null {
  const dia = diaISO(data);
  const entrada = diaISO(animal.dataEntrada);

  if (dia < entrada) {
    return 'A pesagem não pode ser anterior à data de entrada do animal.';
  }
  if (animal.dataSaida) {
    const saida = diaISO(animal.dataSaida);
    if (dia > saida) return 'A pesagem não pode ser posterior à data de saída do animal.';
  }
  return null;
}

/** GMD em g/dia pra ovinos e kg/dia pra bovinos — ver ESPECIE_CONFIG. */
export function formatarGmd(kgPorDia: number, emGramas: boolean): string {
  return emGramas
    ? `${Math.round(kgPorDia * 1000)} g/dia`
    : `${kgPorDia.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg/dia`;
}
