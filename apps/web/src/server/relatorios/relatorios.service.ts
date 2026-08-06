import {
  TipoMetodoManejo,
  EspecieAnimal,
  ESPECIE_CONFIG,
  KG_POR_ARROBA,
  rendimentoEstimadoDoLote,
} from '@pecus/shared';
import { abateDoLote } from '../animais/abate.service';
import { apenasDespesa, listarDespesas, totalPorConta } from '../financeiro/despesas.service';
import { prisma } from '../prisma';
import { garantirEmpresaAtiva } from '../empresa-ativa';

/**
 * Contas que representam alimentação, pra conversão alimentar.
 *
 * Antes era um par de categorias do enum (`RACAO`, `SUPLEMENTO`); depois da
 * unificação a despesa aponta pra uma conta do plano, então a lista é de nomes de
 * conta. São os nomes do plano padrão — fazenda que renomeou a conta precisa que
 * o nome bata, o que é a limitação honesta de identificar por nome.
 */
const CONTAS_ALIMENTACAO = ['Ração', 'Sal', 'Feno'];

/**
 * Quilos de alimentação comprados na fase, pra conversão alimentar.
 *
 * Vem dos lançamentos com quantidade em kg das contas de alimentação. Ficou em
 * consulta própria porque `quantidade`/`unidade` agora vivem no lançamento, e
 * somar só o que está em kg exige olhar a unidade linha por linha.
 */
async function kgDeAlimentacaoDaFase(empresaId: string, loteId: string, faseInicio: Date) {
  const linhas = await prisma.lancamento.findMany({
    where: {
      ...apenasDespesa(empresaId),
      loteId,
      dataDocumento: { gte: faseInicio },
      conta: { nome: { in: CONTAS_ALIMENTACAO } },
    },
    select: { quantidade: true, unidade: true },
  });
  return linhas.reduce(
    (acc, l) => acc + (l.unidade?.toLowerCase() === 'kg' ? (l.quantidade ?? 0) : 0),
    0,
  );
}

export async function dashboard(empresaId: string) {
  empresaId = garantirEmpresaAtiva(empresaId);
  // Despesa vem de `Lancamento` (a tabela `Gasto` não existe mais) e por
  // competência: conta esteja paga ou não. `valorParcela` e não `valorTotal`,
  // senão um parcelado em 3x somaria o total três vezes.
  const [lotes, totalGasto, gastosPorCategoria] = await Promise.all([
    prisma.lote.count({ where: { empresaId } }),
    prisma.lancamento.aggregate({ where: apenasDespesa(empresaId), _sum: { valorParcela: true } }),
    totalPorConta(empresaId),
  ]);

  const animais = await prisma.lote.aggregate({ where: { empresaId }, _sum: { quantidadeAnimais: true } });

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { sanidadeDiasAvisoVencimento: true, avisoVencimentoSanitarioAtivo: true },
  });

  const base = {
    totalLotes: lotes,
    totalAnimais: animais._sum.quantidadeAnimais ?? 0,
    totalGasto: Number(totalGasto._sum.valorParcela ?? 0),
    gastosPorCategoria: gastosPorCategoria.map((g) => ({ categoria: g.categoria, total: g.total })),
  };

  // Aviso desligado pela fazenda: nem calcula, e o dashboard esconde os cards.
  if (empresa && !empresa.avisoVencimentoSanitarioAtivo) {
    return { ...base, vencimentosSanitarios: null };
  }

  const diasAviso = empresa?.sanidadeDiasAvisoVencimento ?? 7;
  const hoje = new Date();
  const limite = new Date(hoje.getTime() + diasAviso * 24 * 60 * 60 * 1000);
  const [vencidos, proximos] = await Promise.all([
    prisma.eventoSanitario.count({ where: { empresaId, proximaAplicacao: { not: null, lt: hoje } } }),
    prisma.eventoSanitario.count({ where: { empresaId, proximaAplicacao: { gte: hoje, lte: limite } } }),
  ]);

  return { ...base, vencimentosSanitarios: { vencidos, proximos, diasAviso } };
}

/**
 * Custo por arroba produzida.
 *
 * O rendimento de carcaça usado aqui é **o realizado quando ele já existe** — a
 * média ponderada das carcaças que voltaram do frigorífico (ver abate.ts) — e a
 * estimativa enquanto não existe. Enquanto o lote está em engorda o único
 * rendimento disponível é o estimado; depois do abate, o realizado é o número
 * verdadeiro, e continuar usando a estimativa seria calcular custo por arroba
 * sobre uma arroba que não foi a que saiu.
 *
 * `origemRendimento` diz qual dos dois entrou na conta, porque um custo por
 * arroba estimado e um realizado não são comparáveis entre si sem essa etiqueta.
 */
export async function custoPorArroba(empresaId: string, loteId: string) {
  empresaId = garantirEmpresaAtiva(empresaId);
  const [lote, empresa, despesas] = await Promise.all([
    prisma.lote.findFirst({
      where: { id: loteId, empresaId },
      include: { pesagens: { orderBy: { data: 'asc' } } },
    }),
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { rendimentoCarcacaPadrao: true } }),
    listarDespesas(empresaId, { loteId }),
  ]);
  if (!lote) return { erro: 'Lote não encontrado.' };

  const custoTotal = despesas.reduce((acc, d) => acc + d.valor, 0);

  const pesoEntrada = lote.pesoMedioEntrada ?? lote.pesagens[0]?.pesoMedio ?? 0;
  const pesoAtual = lote.pesagens[lote.pesagens.length - 1]?.pesoMedio ?? pesoEntrada;
  const ganhoKgPorAnimal = pesoAtual - pesoEntrada;
  const ganhoTotalKg = ganhoKgPorAnimal * lote.quantidadeAnimais;
  const especie = lote.especie as EspecieAnimal;

  const rendimentoEstimado = rendimentoEstimadoDoLote(
    lote.rendimentoCarcaca,
    especie,
    empresa?.rendimentoCarcacaPadrao,
  );
  const abate = await abateDoLote(empresaId, loteId);
  const rendimentoCarcaca = abate.rendimentoRealizado ?? rendimentoEstimado;
  const origemRendimento = abate.rendimentoRealizado != null ? ('realizado' as const) : ('estimado' as const);

  const ganhoCarcacaKg = ganhoTotalKg * (rendimentoCarcaca / 100);

  // Arroba (@ = 15 kg de carcaça) é a unidade de comercialização do boi. Ovino
  // se vende por kg de carcaça, então nem calculamos arroba — seria um número
  // sem significado comercial pro produtor.
  const { vendePorArroba } = ESPECIE_CONFIG[especie];
  const ganhoArrobas = vendePorArroba ? ganhoCarcacaKg / KG_POR_ARROBA : null;

  return {
    especie,
    vendePorArroba,
    custoTotal,
    ganhoKgPorAnimal,
    ganhoTotalKg,
    rendimentoCarcaca,
    /** Qual rendimento entrou na conta — sem isto os dois números se confundem. */
    origemRendimento,
    rendimentoEstimado,
    rendimentoRealizado: abate.rendimentoRealizado,
    /** Quantos dos animais que saíram já têm carcaça informada. */
    abatidosComCarcaca: abate.comCarcaca,
    abatidos: abate.abatidos,
    /** Arrobas de carcaça efetivamente entregues (diferente das arrobas PRODUZIDAS no período). */
    arrobasEntregues: abate.arrobasTotais,
    ganhoCarcacaKg: Number(ganhoCarcacaKg.toFixed(2)),
    custoPorKgCarcaca: ganhoCarcacaKg > 0 ? Number((custoTotal / ganhoCarcacaKg).toFixed(2)) : null,
    ganhoArrobas: ganhoArrobas != null ? Number(ganhoArrobas.toFixed(2)) : null,
    custoPorArroba: ganhoArrobas && ganhoArrobas > 0 ? Number((custoTotal / ganhoArrobas).toFixed(2)) : null,
  };
}

export async function indicadoresMetodo(empresaId: string, loteId: string) {
  empresaId = garantirEmpresaAtiva(empresaId);
  const [lote, empresa, despesas] = await Promise.all([
    prisma.lote.findFirst({
      where: { id: loteId, empresaId },
      include: {
        metodoManejo: true,
        area: true,
        pesagens: { orderBy: { data: 'asc' } },
        metodoHistorico: { include: { metodoManejo: true }, orderBy: { dataInicio: 'desc' } },
      },
    }),
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { rendimentoCarcacaPadrao: true } }),
    listarDespesas(empresaId, { loteId }),
  ]);
  if (!lote) return { erro: 'Lote não encontrado.' };

  const faseAtual = lote.metodoHistorico.find((h) => h.dataFim === null);
  const metodoManejo = faseAtual?.metodoManejo ?? lote.metodoManejo;
  const faseInicio = faseAtual?.dataInicio ?? lote.dataAquisicao;

  if (!metodoManejo) {
    return { temMetodo: false as const, mensagem: 'Lote sem método de manejo definido — sem fórmulas específicas a aplicar.' };
  }

  const pesagensNaFase = lote.pesagens.filter((p) => p.data >= faseInicio);
  const pesoInicialFase =
    faseInicio.getTime() === lote.dataAquisicao.getTime()
      ? (lote.pesoMedioEntrada ?? lote.pesagens[0]?.pesoMedio ?? 0)
      : (lote.pesagens.filter((p) => p.data <= faseInicio).slice(-1)[0]?.pesoMedio ?? pesagensNaFase[0]?.pesoMedio ?? 0);
  const pesoAtual = lote.pesagens[lote.pesagens.length - 1]?.pesoMedio ?? pesoInicialFase;

  const dias = Math.max(1, Math.round((Date.now() - faseInicio.getTime()) / (1000 * 60 * 60 * 24)));
  const ganhoKgPorAnimal = pesoAtual - pesoInicialFase;
  const ganhoTotalKgFase = ganhoKgPorAnimal * lote.quantidadeAnimais;
  const gmdFase = Number((ganhoKgPorAnimal / dias).toFixed(3));

  const gastosDaFase = despesas.filter((d) => d.data >= faseInicio);
  const custoTotalFase = gastosDaFase.reduce((acc, d) => acc + d.valor, 0);

  const especie = lote.especie as EspecieAnimal;
  const rendimentoCarcaca = rendimentoEstimadoDoLote(lote.rendimentoCarcaca, especie, empresa?.rendimentoCarcacaPadrao);
  const configEspecie = ESPECIE_CONFIG[especie];
  const carcacaProduzidaKgFase = ganhoTotalKgFase * (rendimentoCarcaca / 100);
  const arrobasProduzidasFase = configEspecie.vendePorArroba ? carcacaProduzidaKgFase / KG_POR_ARROBA : null;
  const custoPorArrobaFase =
    arrobasProduzidasFase && arrobasProduzidasFase > 0
      ? Number((custoTotalFase / arrobasProduzidasFase).toFixed(2))
      : null;

  // Alimentação é reconhecida pela CONTA do plano, não mais pela categoria de
  // texto livre: as contas de ração e sal do plano padrão (ver
  // CONTAS_ALIMENTACAO). É o mesmo conceito, agora com identificador estável.
  const gastosAlimentacao = gastosDaFase.filter((d) => CONTAS_ALIMENTACAO.includes(d.conta));
  const custoAlimentacaoFase = gastosAlimentacao.reduce((acc, d) => acc + d.valor, 0);
  const kgAlimentacaoFase = await kgDeAlimentacaoDaFase(empresaId, loteId, faseInicio);
  const conversaoAlimentar = kgAlimentacaoFase > 0 && ganhoTotalKgFase > 0 ? Number((kgAlimentacaoFase / ganhoTotalKgFase).toFixed(2)) : null;

  const indicadores: Record<string, number | null> = {};

  if (
    metodoManejo.tipo === TipoMetodoManejo.EXTENSIVO ||
    metodoManejo.tipo === TipoMetodoManejo.SEMICONFINAMENTO ||
    metodoManejo.tipo === TipoMetodoManejo.TIP
  ) {
    if (lote.area?.areaHectares) {
      // UA bovina = 450 kg; ovina = 45 kg. Sem isso, um lote de ovelhas
      // apareceria com taxa de lotação 10x menor do que realmente é.
      indicadores.lotacaoUaHa = Number(
        ((pesoAtual * lote.quantidadeAnimais) / configEspecie.kgPorUnidadeAnimal / lote.area.areaHectares).toFixed(2),
      );
      indicadores.ganhoPorHectare = Number((ganhoTotalKgFase / lote.area.areaHectares).toFixed(2));
    } else {
      indicadores.lotacaoUaHa = null;
      indicadores.ganhoPorHectare = null;
    }
  }

  if (
    metodoManejo.tipo === TipoMetodoManejo.SEMICONFINAMENTO ||
    metodoManejo.tipo === TipoMetodoManejo.TIP ||
    metodoManejo.tipo === TipoMetodoManejo.CONFINAMENTO
  ) {
    indicadores.conversaoAlimentar = conversaoAlimentar;
    indicadores.custoAlimentacaoFase = custoAlimentacaoFase;
  }

  if (metodoManejo.tipo === TipoMetodoManejo.RECRIA) {
    indicadores.custoSaidaRecria = custoTotalFase;
  }

  return {
    temMetodo: true as const,
    especie,
    vendePorArroba: configEspecie.vendePorArroba,
    /** Cordeiro ganha peso na casa das centenas de gramas — a tela exibe em g/dia. */
    gmdEmGramas: configEspecie.gmdEmGramas,
    tipoMetodo: metodoManejo.tipo,
    metodoNome: metodoManejo.nome,
    faseAtual: !!faseAtual && faseAtual.dataFim === null,
    faseInicio: faseInicio.toISOString(),
    dias,
    gmdFase,
    gmdEsperado: lote.gmdEsperado ?? null,
    rendimentoCarcaca,
    ganhoTotalKgFase,
    custoTotalFase,
    carcacaProduzidaKgFase: Number(carcacaProduzidaKgFase.toFixed(2)),
    custoPorKgCarcacaFase:
      carcacaProduzidaKgFase > 0 ? Number((custoTotalFase / carcacaProduzidaKgFase).toFixed(2)) : null,
    arrobasProduzidasFase: arrobasProduzidasFase != null ? Number(arrobasProduzidasFase.toFixed(2)) : null,
    custoPorArrobaFase,
    indicadores,
  };
}
