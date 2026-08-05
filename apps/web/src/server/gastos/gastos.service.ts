import { NotFoundException } from '@nestjs/common';
import { CategoriaGasto, TipoMovimentoInsumo } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { converterParaUnidadeDoInsumo, saldoDe } from '../insumos/custo-insumo.service';
import { prisma } from '../prisma';
import type { CriarGastoDto } from './dto';

const CATEGORIAS_PADRAO: string[] = Object.values(CategoriaGasto);

export function listar(empresaId: string, loteId?: string) {
  return prisma.gasto.findMany({
    where: { empresaId, ...(loteId ? { loteId } : {}) },
    orderBy: { data: 'desc' },
  });
}

export async function criar(empresaId: string, dtoOriginal: CriarGastoDto) {
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'gastos', camposDesativados);
  return prisma.$transaction(async (tx) => {
    const gasto = await tx.gasto.create({
      data: {
        empresaId,
        categoria: dto.categoria,
        valor: dto.valor,
        data: new Date(dto.data),
        loteId: dto.loteId,
        insumoId: dto.insumoId,
        descricao: dto.descricao,
        quantidade: dto.quantidade,
        unidade: dto.unidade,
      },
    });

    // Gasto com insumo + quantidade = compra que abastece o estoque (entrada automática).
    if (dto.insumoId && dto.quantidade) {
      const insumo = await tx.insumo.findFirst({
        where: { id: dto.insumoId, empresaId },
        select: { unidade: true },
      });
      if (!insumo) throw new NotFoundException('Insumo não encontrado nesta fazenda.');

      // A unidade do gasto é texto livre e pode não ser a do cadastro do insumo
      // (comprou em "L" um insumo cadastrado em "ml"). Converte quando dá; se
      // não der, recusa em vez de somar número com significado errado no saldo.
      const quantidade = converterParaUnidadeDoInsumo(dto.quantidade, dto.unidade, insumo.unidade);

      await tx.movimentoInsumo.create({
        data: {
          empresaId,
          insumoId: dto.insumoId,
          tipo: TipoMovimentoInsumo.ENTRADA,
          quantidade,
          // O valor pago é copiado pro movimento porque é dele que sai o custo
          // médio do insumo. Gasto não tem edição, então os dois não divergem
          // por alteração — e a exclusão desfaz o movimento junto (ver `remover`),
          // que era por onde eles divergiam antes.
          valorTotal: dto.valor,
          data: gasto.data,
          gastoId: gasto.id,
        },
      });
    }

    return gasto;
  });
}

/**
 * Apaga o gasto e **desfaz a entrada de estoque que ele criou**.
 *
 * A relação `MovimentoInsumo.gasto` é opcional, então o Prisma só zerava o
 * `gastoId` no delete: o movimento sobrevivia, virava indistinguível de um
 * lançamento manual e continuava inflando saldo **e custo médio** — com o valor
 * pago ainda somando na média, sem mais nenhum gasto que o justificasse.
 *
 * (O comentário em `criar` dizia que gasto e movimento "não têm como divergir"
 * porque gasto não tem edição. Estava errado: esquecia a exclusão, que é
 * exatamente onde eles divergiam.)
 *
 * O saldo pode ficar negativo se o insumo já foi consumido — e isso é verdade,
 * não erro: aquele estoque nunca existiu. Devolve o efeito pra a tela avisar.
 */
export async function remover(empresaId: string, id: string) {
  // Lê antes de apagar pra devolver o que a trilha de atividades registra.
  // Continua tolerante a id inexistente (mesmo comportamento de antes): quem
  // clica em excluir duas vezes não recebe erro.
  const gasto = await prisma.gasto.findFirst({
    where: { id, empresaId },
    include: { insumo: { select: { id: true, nome: true, unidade: true } } },
  });
  if (!gasto) return { ok: true, gasto: null };

  const efeitoNoEstoque = await prisma.$transaction(async (tx) => {
    const movimentos = await tx.movimentoInsumo.findMany({
      where: { gastoId: id },
      select: { id: true, insumoId: true, quantidade: true },
    });

    // Uma baixa gerada por aplicação sanitária jamais tem gastoId, então não há
    // risco de arrastar o consumo de um animal junto com a compra.
    if (movimentos.length > 0) {
      await tx.movimentoInsumo.deleteMany({ where: { gastoId: id } });
    }
    await tx.gasto.deleteMany({ where: { id, empresaId } });

    if (movimentos.length === 0 || !gasto.insumo) return null;

    const saldos = await saldoDe([gasto.insumo.id], tx);
    const saldoDepois = saldos.get(gasto.insumo.id) ?? 0;
    return {
      insumo: gasto.insumo.nome,
      unidade: gasto.insumo.unidade,
      quantidadeDesfeita: movimentos.reduce((soma, m) => soma + m.quantidade, 0),
      saldoDepois,
      aviso:
        saldoDepois < 0
          ? `O estoque de "${gasto.insumo.nome}" ficou negativo (${saldoDepois.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} ${gasto.insumo.unidade}): parte dessa compra já havia sido consumida.`
          : null,
    };
  });

  return {
    ok: true,
    gasto: { categoria: gasto.categoria, valor: Number(gasto.valor) },
    estoque: efeitoNoEstoque,
  };
}

/** Categorias além das padrão que a empresa já cadastrou via "Outros" (categoria é texto livre). */
export async function categoriasCustomizadas(empresaId: string) {
  const gastos = await prisma.gasto.findMany({
    where: { empresaId, NOT: { categoria: { in: CATEGORIAS_PADRAO } } },
    distinct: ['categoria'],
    select: { categoria: true },
    orderBy: { categoria: 'asc' },
  });
  return gastos.map((g) => g.categoria);
}

/** Total de gastos agrupado por categoria (para o dashboard). */
export async function totalPorCategoria(empresaId: string, loteId?: string) {
  const gastos = await prisma.gasto.groupBy({
    by: ['categoria'],
    where: { empresaId, ...(loteId ? { loteId } : {}) },
    _sum: { valor: true },
  });
  return gastos.map((g) => ({ categoria: g.categoria, total: Number(g._sum.valor ?? 0) }));
}
