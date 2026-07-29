import { CategoriaGasto, TipoMetodoManejo } from '@pecus/shared';
import { prisma } from '../prisma';

const RC_PADRAO = 52;
const KG_POR_UA = 450;
const CATEGORIAS_ALIMENTACAO = [CategoriaGasto.RACAO, CategoriaGasto.SUPLEMENTO];

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
  const rendimentoCarcaca = lote.rendimentoCarcaca ?? empresa?.rendimentoCarcacaPadrao ?? RC_PADRAO;
  const ganhoArrobas = (ganhoTotalKg * (rendimentoCarcaca / 100)) / 15;

  return {
    custoTotal,
    ganhoKgPorAnimal,
    ganhoTotalKg,
    rendimentoCarcaca,
    ganhoArrobas: Number(ganhoArrobas.toFixed(2)),
    custoPorArroba: ganhoArrobas > 0 ? Number((custoTotal / ganhoArrobas).toFixed(2)) : null,
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

  const rendimentoCarcaca = lote.rendimentoCarcaca ?? empresa?.rendimentoCarcacaPadrao ?? RC_PADRAO;
  const arrobasProduzidasFase = (ganhoTotalKgFase * (rendimentoCarcaca / 100)) / 15;
  const custoPorArrobaFase = arrobasProduzidasFase > 0 ? Number((custoTotalFase / arrobasProduzidasFase).toFixed(2)) : null;

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
      indicadores.lotacaoUaHa = Number(((pesoAtual * lote.quantidadeAnimais) / KG_POR_UA / lote.area.areaHectares).toFixed(2));
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
    arrobasProduzidasFase: Number(arrobasProduzidasFase.toFixed(2)),
    custoPorArrobaFase,
    indicadores,
  };
}
