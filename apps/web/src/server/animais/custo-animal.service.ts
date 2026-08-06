import { NotFoundException } from '@nestjs/common';
import {
  TipoMovimentoInsumo,
  calcularCompraLote,
  montarCustoAnimal,
  quantidadeLegivel,
  ratearGastosDoLote,
  temDadosDeCompra,
  type CustoAnimal,
  type CustoDiretoAnimal,
  type RateioDoLote,
} from '@pecus/shared';
import { despesasDeLotes } from '../financeiro/despesas.service';
import { prisma } from '../prisma';

/**
 * Quanto custou produzir um animal.
 *
 * Compõe três parcelas (a conta em si está em `custo-animal.ts` no shared, pura
 * e testável): compra por cabeça, rateio dos gastos do lote, e o que foi lançado
 * direto naquele bicho — hoje o insumo aplicado na sanidade.
 *
 * O ponto que dá sentido a tudo: dois animais do mesmo lote têm a mesma compra e
 * o mesmo rateio, e diferem exatamente na terceira parcela. É o remédio que um
 * tomou e o outro não que faz um custar mais — era isso que não existia.
 */

/** Custo de vários animais numa tacada, pra tela que lista o lote. */
export async function custoDeAnimais(
  empresaId: string,
  animais: { id: string; loteId: string | null; valorRecebido?: unknown }[],
): Promise<Map<string, CustoAnimal>> {
  const resultado = new Map<string, CustoAnimal>();
  if (animais.length === 0) return resultado;

  const loteIds = [...new Set(animais.map((a) => a.loteId).filter((id): id is string => !!id))];
  const animalIds = animais.map((a) => a.id);

  // Três consultas pro conjunto inteiro, independente de quantos animais. Fazer
  // por animal seria um N+1 numa tela que lista o lote todo — foi o que derrubou
  // reprodução e estoque antes, porque cada consulta ocupa uma conexão do pool.
  const [lotes, despesasPorLote, animaisPorLote, eventos, consumos] = await Promise.all([
    loteIds.length
      ? prisma.lote.findMany({
          where: { id: { in: loteIds }, empresaId },
          select: {
            id: true,
            quantidadeAnimais: true,
            pesoMedioCompra: true,
            valorKgCompra: true,
            fretePorCabeca: true,
            comissaoPorCabeca: true,
          },
        })
      : [],
    // Despesas vêm de `Lancamento` agora, por `despesasDeLotes` — o único lugar
    // que define o que é despesa de custo (competência, e compra de insumo fora
    // do rateio). Antes lia `Gasto`, tabela que não existe mais.
    despesasDeLotes(empresaId, loteIds),
    loteIds.length
      ? prisma.animal.groupBy({ by: ['loteId'], where: { empresaId, loteId: { in: loteIds } }, _count: { _all: true } })
      : [],
    prisma.eventoSanitario.findMany({
      where: { empresaId, animalId: { in: animalIds }, insumoId: { not: null } },
      select: {
        animalId: true,
        nome: true,
        data: true,
        custo: true,
        quantidadeInsumo: true,
        insumo: { select: { nome: true, unidade: true } },
      },
      orderBy: { data: 'desc' },
    }),
    // Consumo de estoque atribuído ao lote (ração, sal). É o que faz esse
    // dinheiro existir: a compra do insumo fica fora do rateio de propósito, e
    // sem o consumo aqui o valor desaparecia entre comprar e usar.
    loteIds.length
      ? prisma.movimentoInsumo.findMany({
          where: { empresaId, loteId: { in: loteIds }, tipo: TipoMovimentoInsumo.SAIDA },
          select: { loteId: true, valorTotal: true },
        })
      : [],
  ]);

  const cadastradosPorLote = new Map(animaisPorLote.map((g) => [g.loteId ?? '', g._count._all]));

  const rateioPorLote = new Map<string, RateioDoLote>();
  const compraPorLote = new Map<string, number | null>();
  for (const lote of lotes) {
    const gastosDoLote = (despesasPorLote.get(lote.id) ?? []).map((d) => ({
      valor: d.valor,
      insumoId: d.insumoId,
      categoria: d.conta,
    }));

    const consumosDoLote = consumos
      .filter((c) => c.loteId === lote.id)
      .map((c) => ({ valorTotal: c.valorTotal == null ? null : Number(c.valorTotal) }));

    rateioPorLote.set(
      lote.id,
      ratearGastosDoLote(
        gastosDoLote,
        lote.quantidadeAnimais,
        cadastradosPorLote.get(lote.id) ?? 0,
        consumosDoLote,
      ),
    );

    compraPorLote.set(
      lote.id,
      temDadosDeCompra(lote)
        ? calcularCompraLote({
            pesoMedioCompra: lote.pesoMedioCompra ?? 0,
            valorKgCompra: lote.valorKgCompra ?? 0,
            fretePorCabeca: lote.fretePorCabeca ?? 0,
            comissaoPorCabeca: lote.comissaoPorCabeca ?? 0,
            quantidadeAnimais: lote.quantidadeAnimais,
          }).custoPorCabeca
        : null,
    );
  }

  const diretosPorAnimal = new Map<string, CustoDiretoAnimal[]>();
  for (const evento of eventos) {
    // A quantidade fica gravada na unidade do cadastro (0,005 L); mostrar assim
    // seria ilegível, então volta pra unidade que se lê (5 ml).
    const legivel =
      evento.quantidadeInsumo != null
        ? quantidadeLegivel(evento.quantidadeInsumo, evento.insumo?.unidade)
        : null;

    const lista = diretosPorAnimal.get(evento.animalId) ?? [];
    lista.push({
      descricao: evento.insumo?.nome ? `${evento.nome} (${evento.insumo.nome})` : evento.nome,
      data: evento.data.toISOString().slice(0, 10),
      valor: evento.custo == null ? null : Number(evento.custo),
      quantidade: legivel?.quantidade ?? null,
      unidade: legivel?.unidade ?? null,
      origem: 'sanidade',
    });
    diretosPorAnimal.set(evento.animalId, lista);
  }

  for (const animal of animais) {
    resultado.set(
      animal.id,
      montarCustoAnimal({
        temLote: !!animal.loteId,
        compraPorCabeca: animal.loteId ? (compraPorLote.get(animal.loteId) ?? null) : null,
        rateio: animal.loteId ? (rateioPorLote.get(animal.loteId) ?? null) : null,
        diretos: diretosPorAnimal.get(animal.id) ?? [],
        receita: animal.valorRecebido == null ? null : Number(animal.valorRecebido),
      }),
    );
  }
  return resultado;
}

export async function custoDoAnimal(empresaId: string, animalId: string): Promise<CustoAnimal> {
  const animal = await prisma.animal.findFirst({
    where: { id: animalId, empresaId },
    select: { id: true, loteId: true, valorRecebido: true },
  });
  if (!animal) throw new NotFoundException('Animal não encontrado.');
  const mapa = await custoDeAnimais(empresaId, [animal]);
  return mapa.get(animal.id)!;
}
