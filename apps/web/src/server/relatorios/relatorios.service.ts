import { CategoriaGasto, TipoMetodoManejo, EspecieAnimal, ESPECIE_CONFIG } from '@pecus/shared';
import { prisma } from '../prisma';

const KG_POR_ARROBA = 15;
const CATEGORIAS_ALIMENTACAO = [CategoriaGasto.RACAO, CategoriaGasto.SUPLEMENTO];

/**
 * Rendimento de carcaça a usar nos cálculos do lote.
 *
 * O valor configurado na fazenda (`rendimentoCarcacaPadrao`) é rotulado como
 * padrão de bovino na tela de Configurações, então só se aplica a bovinos;
 * pra outras espécies caímos no padrão da própria espécie (ovino ~45%).
 */
function rendimentoCarcacaDoLote(
  rendimentoDoLote: number | null,
  especie: EspecieAnimal,
  rendimentoPadraoEmpresa?: number | null,
): number {
  if (rendimentoDoLote != null) return rendimentoDoLote;
  if (especie === EspecieAnimal.BOVINO && rendimentoPadraoEmpresa != null) return rendimentoPadraoEmpresa;
  return ESPECIE_CONFIG[especie].rendimentoCarcacaPadrao;
}

export async function dashboard(empresaId: string) {
  const [lotes, totalGasto, gastosPorCategoria] = await Promise.all([
    prisma.lote.count({ where: { empresaId } }),
    prisma.gasto.aggregate({ where: { empresaId }, _sum: { valor: true } }),
    prisma.gasto.groupBy({ by: ['categoria'], where: { empresaId }, _sum: { valor: true } }),
  ]);

  const animais = await prisma.lote.aggregate({ where: { empresaId }, _sum: { quantidadeAnimais: true } });

  const hoje = new Date();
  const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
  const [vencidos, proximos7Dias] = await Promise.all([
    prisma.eventoSanitario.count({ where: { empresaId, proximaAplicacao: { not: null, lt: hoje } } }),
    prisma.eventoSanitario.count({ where: { empresaId, proximaAplicacao: { gte: hoje, lte: em7Dias } } }),
  ]);

  return {
    totalLotes: lotes,
    totalAnimais: animais._sum.quantidadeAnimais ?? 0,
    totalGasto: Number(totalGasto._sum.valor ?? 0),
    vencimentosSanitarios: { vencidos, proximos7Dias },
    gastosPorCategoria: gastosPorCategoria.map((g) => ({ categoria: g.categoria, total: Number(g._sum.valor ?? 0) })),
  };
}

export async function custoPorArroba(empresaId: string, loteId: string) {
  const [lote, empresa] = await Promise.all([
    prisma.lote.findFirst({
      where: { id: loteId, empresaId },
      include: { pesagens: { orderBy: { data: 'asc' } }, gastos: true },
    }),
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { rendimentoCarcacaPadrao: true } }),
  ]);
  if (!lote) return { erro: 'Lote não encontrado.' };

  const custoTotal = lote.gastos.reduce((acc, g) => acc + Number(g.valor), 0);

  const pesoEntrada = lote.pesoMedioEntrada ?? lote.pesagens[0]?.pesoMedio ?? 0;
  const pesoAtual = lote.pesagens[lote.pesagens.length - 1]?.pesoMedio ?? pesoEntrada;
  const ganhoKgPorAnimal = pesoAtual - pesoEntrada;
  const ganhoTotalKg = ganhoKgPorAnimal * lote.quantidadeAnimais;
  const especie = lote.especie as EspecieAnimal;
  const rendimentoCarcaca = rendimentoCarcacaDoLote(lote.rendimentoCarcaca, especie, empresa?.rendimentoCarcacaPadrao);
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
    ganhoCarcacaKg: Number(ganhoCarcacaKg.toFixed(2)),
    custoPorKgCarcaca: ganhoCarcacaKg > 0 ? Number((custoTotal / ganhoCarcacaKg).toFixed(2)) : null,
    ganhoArrobas: ganhoArrobas != null ? Number(ganhoArrobas.toFixed(2)) : null,
    custoPorArroba: ganhoArrobas && ganhoArrobas > 0 ? Number((custoTotal / ganhoArrobas).toFixed(2)) : null,
  };
}

export async function indicadoresMetodo(empresaId: string, loteId: string) {
  const [lote, empresa] = await Promise.all([
    prisma.lote.findFirst({
      where: { id: loteId, empresaId },
      include: {
        metodoManejo: true,
        area: true,
        pesagens: { orderBy: { data: 'asc' } },
        gastos: true,
        metodoHistorico: { include: { metodoManejo: true }, orderBy: { dataInicio: 'desc' } },
      },
    }),
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { rendimentoCarcacaPadrao: true } }),
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

  const gastosDaFase = lote.gastos.filter((g) => g.data >= faseInicio);
  const custoTotalFase = gastosDaFase.reduce((acc, g) => acc + Number(g.valor), 0);

  const especie = lote.especie as EspecieAnimal;
  const rendimentoCarcaca = rendimentoCarcacaDoLote(lote.rendimentoCarcaca, especie, empresa?.rendimentoCarcacaPadrao);
  const configEspecie = ESPECIE_CONFIG[especie];
  const carcacaProduzidaKgFase = ganhoTotalKgFase * (rendimentoCarcaca / 100);
  const arrobasProduzidasFase = configEspecie.vendePorArroba ? carcacaProduzidaKgFase / KG_POR_ARROBA : null;
  const custoPorArrobaFase =
    arrobasProduzidasFase && arrobasProduzidasFase > 0
      ? Number((custoTotalFase / arrobasProduzidasFase).toFixed(2))
      : null;

  const gastosAlimentacao = gastosDaFase.filter((g) => CATEGORIAS_ALIMENTACAO.includes(g.categoria as CategoriaGasto));
  const custoAlimentacaoFase = gastosAlimentacao.reduce((acc, g) => acc + Number(g.valor), 0);
  const kgAlimentacaoFase = gastosAlimentacao.reduce((acc, g) => acc + (g.unidade?.toLowerCase() === 'kg' ? (g.quantidade ?? 0) : 0), 0);
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
