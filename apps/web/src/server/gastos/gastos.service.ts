import { NotFoundException } from '@nestjs/common';
import { CategoriaGasto, TipoMovimentoInsumo } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { converterParaUnidadeDoInsumo } from '../insumos/custo-insumo.service';
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
          // médio do insumo. Copiar é seguro aqui: gasto não tem edição, só
          // criação e exclusão, então os dois não têm como divergir.
          valorTotal: dto.valor,
          data: gasto.data,
          gastoId: gasto.id,
        },
      });
    }

    return gasto;
  });
}

export async function remover(empresaId: string, id: string) {
  // Lê antes de apagar pra devolver o que a trilha de atividades registra.
  // Continua tolerante a id inexistente (mesmo comportamento de antes): quem
  // clica em excluir duas vezes não recebe erro.
  const gasto = await prisma.gasto.findFirst({ where: { id, empresaId } });
  if (!gasto) return { ok: true, gasto: null };
  await prisma.gasto.deleteMany({ where: { id, empresaId } });
  return { ok: true, gasto: { categoria: gasto.categoria, valor: Number(gasto.valor) } };
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
