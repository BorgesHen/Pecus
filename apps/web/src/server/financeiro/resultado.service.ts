import { NaturezaFinanceira } from '@pecus/shared';
import { prisma } from '../prisma';

/**
 * As três leituras que o plano de contas existia para dar e não dava: saldo do
 * banco, fluxo de caixa e resultado por grupo.
 *
 * Antes desta implementação os grupos do plano ("Custos Variáveis", "Despesas com
 * Pessoal") existiam no banco e **nenhuma tela somava por eles** — a estrutura
 * contábil estava montada e não era usada para nada. E `ContaBancaria` tinha
 * `saldoInicial` gravado que nenhuma linha de código lia.
 *
 * A distinção que organiza tudo aqui:
 *
 *   COMPETÊNCIA (`dataDocumento`) → resultado: quando o fato aconteceu.
 *   CAIXA       (`dataLiquidacao`) → saldo e fluxo: quando o dinheiro andou.
 *
 * Uma conta a pagar de ração comprada em janeiro e paga em março é custo de
 * janeiro e saída de caixa de março. Misturar os dois é o erro clássico de
 * controle financeiro de fazenda, e é por isso que as duas leituras não
 * compartilham filtro.
 */

// `valorParcela` sempre, nunca `valorTotal`: cada parcela é uma linha própria, e
// somar o total em cada uma multiplicaria o valor pelo número de parcelas.

// ---------------------------------------------------------------------------
// Saldo bancário
// ---------------------------------------------------------------------------

export interface SaldoBanco {
  id: string;
  nome: string;
  ativo: boolean;
  saldoInicial: number;
  dataSaldoInicial: string | null;
  /** Recebido menos pago, contando só o que foi liquidado nesta conta. */
  movimentado: number;
  /** saldoInicial + movimentado. */
  saldoAtual: number;
  recebido: number;
  pago: number;
}

/**
 * Saldo de cada conta bancária: saldo inicial mais o que foi liquidado nela.
 *
 * Só liquidado entra. Uma conta a pagar em aberto não tirou dinheiro do banco
 * ainda, e somá-la mostraria um saldo menor do que o extrato — que é exatamente o
 * tipo de divergência que faz o produtor perder confiança no sistema.
 */
export async function saldosBancarios(empresaId: string) {
  const [bancos, liquidados] = await Promise.all([
    prisma.contaBancaria.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } }),
    // Uma consulta com a natureza junto: o sinal do movimento depende dela
    // (receita entra, despesa sai), e um groupBy não traz o grupo do plano.
    prisma.lancamento.findMany({
      where: { empresaId, dataLiquidacao: { not: null } },
      select: { contaBancariaId: true, valorParcela: true, conta: { select: { grupo: { select: { natureza: true } } } } },
    }),
  ]);

  const porBanco = new Map<string, { recebido: number; pago: number }>();
  let liquidadoSemBanco = 0;
  for (const linha of liquidados) {
    const valor = Number(linha.valorParcela);
    const receita = linha.conta.grupo.natureza === NaturezaFinanceira.RECEITA;
    if (!linha.contaBancariaId) {
      liquidadoSemBanco += receita ? valor : -valor;
      continue;
    }
    const atual = porBanco.get(linha.contaBancariaId) ?? { recebido: 0, pago: 0 };
    if (receita) atual.recebido += valor;
    else atual.pago += valor;
    porBanco.set(linha.contaBancariaId, atual);
  }

  const contas = bancos.map((banco) => {
    const m = porBanco.get(banco.id) ?? { recebido: 0, pago: 0 };
    const saldoInicial = Number(banco.saldoInicial);
    const movimentado = centavos(m.recebido - m.pago);
    return {
      id: banco.id,
      nome: banco.nome,
      ativo: banco.ativo,
      saldoInicial,
      dataSaldoInicial: banco.dataSaldoInicial ? banco.dataSaldoInicial.toISOString().slice(0, 10) : null,
      recebido: centavos(m.recebido),
      pago: centavos(m.pago),
      movimentado,
      saldoAtual: centavos(saldoInicial + movimentado),
    };
  });

  return {
    contas,
    saldoTotal: centavos(contas.filter((c) => c.ativo).reduce((soma, c) => soma + c.saldoAtual, 0)),
    /**
     * Dinheiro que já andou sem banco informado. Não entra em saldo de conta
     * nenhuma — aparece separado pra a diferença com o extrato ter explicação em
     * vez de virar mistério.
     */
    liquidadoSemBanco: centavos(liquidadoSemBanco),
  };
}

const centavos = (valor: number) => Math.round(valor * 100) / 100;

// ---------------------------------------------------------------------------
// Fluxo de caixa
// ---------------------------------------------------------------------------

export interface MesDoFluxo {
  /** "AAAA-MM". */
  mes: string;
  entradas: number;
  saidas: number;
  /** entradas − saídas do mês. */
  resultado: number;
  /** Saldo acumulado desde o saldo inicial dos bancos. */
  acumulado: number;
}

/**
 * Fluxo de caixa mês a mês, pelo **regime de caixa**: só o que foi liquidado, na
 * data em que foi liquidado.
 *
 * O acumulado parte da soma dos saldos iniciais dos bancos, então a última linha
 * bate com o saldo atual — é o que permite conferir contra o extrato.
 */
export async function fluxoDeCaixa(empresaId: string, meses = 12) {
  const [linhas, bancos] = await Promise.all([
    prisma.lancamento.findMany({
      where: { empresaId, dataLiquidacao: { not: null } },
      select: {
        dataLiquidacao: true,
        valorParcela: true,
        conta: { select: { grupo: { select: { natureza: true } } } },
      },
      orderBy: { dataLiquidacao: 'asc' },
    }),
    prisma.contaBancaria.aggregate({ where: { empresaId, ativo: true }, _sum: { saldoInicial: true } }),
  ]);

  const porMes = new Map<string, { entradas: number; saidas: number }>();
  for (const linha of linhas) {
    const mes = linha.dataLiquidacao!.toISOString().slice(0, 7);
    const atual = porMes.get(mes) ?? { entradas: 0, saidas: 0 };
    const valor = Number(linha.valorParcela);
    if (linha.conta.grupo.natureza === NaturezaFinanceira.RECEITA) atual.entradas += valor;
    else atual.saidas += valor;
    porMes.set(mes, atual);
  }

  const ordenados = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let acumulado = Number(bancos._sum.saldoInicial ?? 0);
  const todos: MesDoFluxo[] = ordenados.map(([mes, v]) => {
    const resultado = v.entradas - v.saidas;
    acumulado += resultado;
    return {
      mes,
      entradas: centavos(v.entradas),
      saidas: centavos(v.saidas),
      resultado: centavos(resultado),
      acumulado: centavos(acumulado),
    };
  });

  // Recorta os últimos N meses **depois** de acumular, pra o acumulado do
  // primeiro mês exibido já carregar tudo que veio antes.
  return {
    saldoInicialBancos: centavos(Number(bancos._sum.saldoInicial ?? 0)),
    meses: todos.slice(-meses),
    /** Total do período inteiro, não só do recorte. */
    totalEntradas: centavos(todos.reduce((s, m) => s + m.entradas, 0)),
    totalSaidas: centavos(todos.reduce((s, m) => s + m.saidas, 0)),
    saldoFinal: centavos(acumulado),
  };
}

// ---------------------------------------------------------------------------
// Resultado por grupo (DRE)
// ---------------------------------------------------------------------------

export interface LinhaResultado {
  grupoId: string;
  codigo: string;
  nome: string;
  natureza: NaturezaFinanceira;
  total: number;
  /** Quanto este grupo representa da receita total (%) — nulo quando não há receita. */
  percentualDaReceita: number | null;
  contas: { contaId: string; codigo: string; nome: string; total: number }[];
}

/**
 * Resultado do período por grupo do plano de contas — o DRE que a estrutura
 * existia para produzir e ninguém somava.
 *
 * Por **competência** (`dataDocumento`), incluindo o que ainda não foi pago: é o
 * resultado do período, não o extrato. Quem quer o extrato usa o fluxo de caixa.
 */
export async function resultadoPorGrupo(
  empresaId: string,
  filtros: { de?: string; ate?: string; loteId?: string } = {},
) {
  const periodo =
    filtros.de || filtros.ate
      ? {
          dataDocumento: {
            ...(filtros.de ? { gte: new Date(`${filtros.de}T00:00:00`) } : {}),
            // O dia do "até" entra inteiro.
            ...(filtros.ate ? { lte: new Date(`${filtros.ate}T23:59:59.999`) } : {}),
          },
        }
      : {};

  const linhas = await prisma.lancamento.findMany({
    where: { empresaId, ...periodo, ...(filtros.loteId ? { loteId: filtros.loteId } : {}) },
    select: {
      valorParcela: true,
      conta: {
        select: {
          id: true,
          codigo: true,
          nome: true,
          grupo: { select: { id: true, codigo: true, nome: true, natureza: true, ordem: true } },
        },
      },
    },
  });

  const grupos = new Map<
    string,
    { codigo: string; nome: string; natureza: NaturezaFinanceira; ordem: number; total: number; contas: Map<string, { codigo: string; nome: string; total: number }> }
  >();

  for (const linha of linhas) {
    const g = linha.conta.grupo;
    const valor = Number(linha.valorParcela);
    const grupo =
      grupos.get(g.id) ??
      { codigo: g.codigo, nome: g.nome, natureza: g.natureza as NaturezaFinanceira, ordem: g.ordem, total: 0, contas: new Map() };
    grupo.total += valor;
    const conta = grupo.contas.get(linha.conta.id) ?? { codigo: linha.conta.codigo, nome: linha.conta.nome, total: 0 };
    conta.total += valor;
    grupo.contas.set(linha.conta.id, conta);
    grupos.set(g.id, grupo);
  }

  const receitaTotal = [...grupos.values()]
    .filter((g) => g.natureza === NaturezaFinanceira.RECEITA)
    .reduce((s, g) => s + g.total, 0);
  const despesaTotal = [...grupos.values()]
    .filter((g) => g.natureza === NaturezaFinanceira.DESPESA)
    .reduce((s, g) => s + g.total, 0);

  const resultado: LinhaResultado[] = [...grupos.entries()]
    .map(([grupoId, g]) => ({
      grupoId,
      codigo: g.codigo,
      nome: g.nome,
      natureza: g.natureza,
      total: centavos(g.total),
      // Percentual sobre a receita é como se lê um DRE: cada despesa vale "tantos
      // por cento do que entrou". Sem receita no período, não há sobre o que
      // calcular — nulo em vez de dividir por zero.
      percentualDaReceita: receitaTotal > 0 ? centavos((g.total / receitaTotal) * 100) : null,
      contas: [...g.contas.entries()]
        .map(([contaId, c]) => ({ contaId, codigo: c.codigo, nome: c.nome, total: centavos(c.total) }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => {
      // Receita antes de despesa, e dentro de cada uma pela ordem do plano.
      if (a.natureza !== b.natureza) return a.natureza === NaturezaFinanceira.RECEITA ? -1 : 1;
      return a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true });
    });

  return {
    grupos: resultado,
    receitaTotal: centavos(receitaTotal),
    despesaTotal: centavos(despesaTotal),
    /** Receita − despesa do período. */
    resultado: centavos(receitaTotal - despesaTotal),
    /** Resultado sobre receita (%) — a margem. Nulo sem receita. */
    margem: receitaTotal > 0 ? centavos(((receitaTotal - despesaTotal) / receitaTotal) * 100) : null,
  };
}
