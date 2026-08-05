/**
 * Custo de produção de um animal individual.
 *
 * A ideia, na linguagem do produtor: existe um custo que é do lote inteiro
 * (ração, sal, frete — lançado em média por cabeça) e existe um custo que é
 * daquele bicho (o remédio que ele tomou, o exame que ele fez). O que faz um
 * animal custar mais que o vizinho do mesmo lote está quase todo na segunda
 * parte, e é ela que não existia até agora.
 *
 * As três parcelas:
 *
 *   1. COMPRA        — o VALOR CABEÇA do lote (ver compra-lote.ts).
 *   2. RATEIO        — gastos do lote ÷ cabeças.
 *   3. DIRETO        — o que foi lançado neste animal (insumo aplicado na
 *                      sanidade, ao custo médio do estoque no dia).
 *
 * Uma decisão que evita contar dinheiro duas vezes: o rateio **ignora os gastos
 * de compra de insumo** (os que têm `insumoId`). Comprar 1 L de remédio não é
 * custo de produção no dia da compra — é estoque; vira custo quando é aplicado,
 * e aí entra como custo direto do animal que recebeu. Se entrasse nas duas
 * pontas, os R$ 1.000 do frasco apareceriam rateados entre todas as cabeças E
 * de novo na cabeça que tomou a dose.
 *
 * O outro lado dessa decisão: se a compra sai do rateio, o **consumo** tem que
 * entrar em algum lugar, senão o dinheiro desaparece entre comprar e usar. Foi
 * exatamente o que aconteceu com a ração comprada pelo estoque: a compra saía do
 * rateio e o consumo não era atribuído a lote nenhum, então não virava custo de
 * ninguém. Por isso o rateio soma, junto com os gastos comuns, o **consumo de
 * insumo atribuído ao lote** (`MovimentoInsumo` de SAÍDA com `loteId`), avaliado
 * ao custo médio do estoque no dia.
 *
 * Resumindo os três caminhos do dinheiro de insumo:
 *
 *   compra (Gasto com insumo)  → estoque, não é custo ainda
 *   consumo atribuído ao lote  → rateio, dividido por cabeça (ração, sal)
 *   aplicado num animal        → custo direto daquele animal (remédio, vacina)
 *
 * Função pura, sem Prisma: quem monta as entradas é o service.
 */

/**
 * Arredonda em quatro casas, evitando o arrastar de casas do ponto flutuante.
 *
 * Quatro e não duas: a parcela de um animal pode valer frações de centavo (a dose
 * de 0,2 ml de um produto de R$ 12,00/L custa R$ 0,0024). Arredondar a SOMA em
 * centavos aqui zerava exatamente o valor que a gravação já tinha preservado — o
 * custo aparecia no evento e desaparecia no total. Quem decide quantas casas
 * mostrar é a exibição (`brlValor`), não a conta.
 */
function arredondar(valor: number): number {
  return Math.round(valor * 10_000) / 10_000;
}

export interface GastoParaCusto {
  valor: number;
  /** Preenchido = compra de insumo (estoque), fica fora do rateio. */
  insumoId?: string | null;
  categoria?: string | null;
}

export interface ConsumoParaCusto {
  /** Custo do que saiu do estoque, ao custo médio do dia. Nulo = insumo sem valor. */
  valorTotal: number | null;
}

export interface RateioDoLote {
  /** Total que entra no rateio: gastos comuns + consumo de insumo do lote. */
  totalRateavel: number;
  /** Só os gastos comuns (ração lançada direto, frete, diária). */
  totalGastos: number;
  /** Só o consumo de estoque atribuído a este lote. */
  totalConsumoDeInsumo: number;
  /** Gastos de compra de insumo do lote — informativo, não rateado (é estoque). */
  totalComprasDeInsumo: number;
  /** Cabeças usadas como divisor. */
  cabecas: number;
  /** totalRateavel ÷ cabecas. */
  porCabeca: number;
}

/**
 * Divide os gastos do lote por cabeça.
 *
 * O divisor é a **quantidade declarada** do lote, não o número de animais
 * cadastrados individualmente: quem tem 50 cabeças e só catalogou 10 continua
 * gastando ração pras 50, e dividir por 10 daria um custo cinco vezes maior. Só
 * cai pro número de cadastrados quando a quantidade declarada é zero.
 */
export function ratearGastosDoLote(
  gastos: GastoParaCusto[],
  quantidadeDeclarada: number,
  animaisCadastrados = 0,
  /** Saídas de estoque atribuídas a este lote — ração, sal, o que se gastou no trato. */
  consumos: ConsumoParaCusto[] = [],
): RateioDoLote {
  let totalGastos = 0;
  let totalComprasDeInsumo = 0;
  for (const gasto of gastos) {
    if (gasto.insumoId) totalComprasDeInsumo += gasto.valor;
    else totalGastos += gasto.valor;
  }

  // Consumo sem valor (insumo sem custo de compra conhecido) não entra como
  // zero: não se sabe quanto custou, e somar zero afirmaria que não custou nada.
  const totalConsumoDeInsumo = consumos.reduce((soma, c) => soma + (c.valorTotal ?? 0), 0);
  const totalRateavel = totalGastos + totalConsumoDeInsumo;

  const cabecas = Math.max(0, Math.trunc(quantidadeDeclarada || 0)) || Math.max(0, animaisCadastrados);

  return {
    totalRateavel: arredondar(totalRateavel),
    totalGastos: arredondar(totalGastos),
    totalConsumoDeInsumo: arredondar(totalConsumoDeInsumo),
    totalComprasDeInsumo: arredondar(totalComprasDeInsumo),
    cabecas,
    porCabeca: cabecas > 0 ? arredondar(totalRateavel / cabecas) : 0,
  };
}

export interface CustoDiretoAnimal {
  /** O que identifica o lançamento na tela ("Vermífugo Ivermectina 1%"). */
  descricao: string;
  data: string;
  /** Nulo = o insumo aplicado não tem valor de compra conhecido. */
  valor: number | null;
  /** Quantidade consumida, na unidade de cadastro do insumo. */
  quantidade?: number | null;
  unidade?: string | null;
  origem: 'sanidade';
}

export interface CustoAnimal {
  /** VALOR CABEÇA do lote, ou null quando o lote não tem dados de compra. */
  compra: number | null;
  rateio: RateioDoLote | null;
  /** Soma dos lançamentos diretos com valor conhecido. */
  totalDireto: number;
  /** Lançamentos diretos, do mais recente pro mais antigo. */
  diretos: CustoDiretoAnimal[];
  /** Quantos lançamentos diretos ficaram sem valor (insumo sem custo de compra). */
  diretosSemValor: number;
  /** compra + rateio.porCabeca + totalDireto. */
  total: number;
  /**
   * O que falta pro total ser completo, em português, pra a tela avisar em vez
   * de mostrar um número que parece fechado e não está.
   */
  ressalvas: string[];
}

export function montarCustoAnimal(entrada: {
  compraPorCabeca?: number | null;
  rateio?: RateioDoLote | null;
  diretos?: CustoDiretoAnimal[];
  /** Animal sem lote não tem compra nem rateio — muda a ressalva. */
  temLote?: boolean;
}): CustoAnimal {
  const diretos = entrada.diretos ?? [];
  const comValor = diretos.filter((d) => d.valor != null);
  const totalDireto = arredondar(comValor.reduce((soma, d) => soma + (d.valor ?? 0), 0));
  const compra = entrada.compraPorCabeca ?? null;
  const rateio = entrada.rateio ?? null;

  const ressalvas: string[] = [];
  if (!entrada.temLote) {
    ressalvas.push('Animal sem lote — não há custo de compra nem rateio de gastos.');
  } else {
    if (compra == null) {
      ressalvas.push('O lote não tem dados de compra (peso médio e valor do kg), então o custo de aquisição não entra.');
    }
    if (rateio && rateio.cabecas === 0) {
      ressalvas.push('O lote está com zero cabeças, então não há como ratear os gastos.');
    }
    if (rateio && rateio.totalComprasDeInsumo > 0) {
      ressalvas.push(
        'As compras de insumo lançadas neste lote não são rateadas: elas entram no custo quando o insumo é consumido — como consumo do lote (ração, sal) ou aplicado num animal (remédio).',
      );
    }
    // Compra de insumo no lote sem nenhum consumo atribuído a ele é o sintoma
    // de dinheiro parado no meio do caminho: comprou e nunca deu baixa pro lote.
    if (rateio && rateio.totalComprasDeInsumo > 0 && rateio.totalConsumoDeInsumo === 0) {
      ressalvas.push(
        'Há compra de insumo neste lote sem nenhum consumo lançado para ele. Registre o consumo no Estoque escolhendo este lote para que a ração entre no custo.',
      );
    }
  }
  const semValor = diretos.length - comValor.length;
  if (semValor > 0) {
    ressalvas.push(
      semValor === 1
        ? 'Um lançamento não tem valor porque o insumo aplicado não tem custo de compra registrado.'
        : `${semValor} lançamentos não têm valor porque os insumos aplicados não têm custo de compra registrado.`,
    );
  }

  return {
    compra,
    rateio,
    totalDireto,
    diretos,
    diretosSemValor: semValor,
    total: arredondar((compra ?? 0) + (rateio?.porCabeca ?? 0) + totalDireto),
    ressalvas,
  };
}

/**
 * Custo médio ponderado de um insumo, a partir das entradas de estoque que têm
 * valor.
 *
 * Entrada sem valor (saldo inicial, ajuste de inventário, doação) fica fora do
 * cálculo em vez de entrar como zero: valer zero baixaria a média e faria o
 * remédio parecer mais barato do que é. O custo por unidade é o que se pagou,
 * dividido pelo que se comprou.
 */
export function custoMedioInsumo(
  entradas: { quantidade: number; valorTotal?: number | null }[],
): { custoUnitario: number | null; quantidadeValorada: number; valorTotal: number } {
  let quantidade = 0;
  let valor = 0;
  for (const entrada of entradas) {
    if (entrada.valorTotal == null || entrada.quantidade <= 0) continue;
    quantidade += entrada.quantidade;
    valor += entrada.valorTotal;
  }
  return {
    custoUnitario: quantidade > 0 ? valor / quantidade : null,
    quantidadeValorada: quantidade,
    valorTotal: arredondar(valor),
  };
}
