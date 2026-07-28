import { Injectable } from '@nestjs/common';
import { CategoriaGasto, TipoMovimentoInsumo } from '@pecus/shared';
import { removerCamposDesativados } from '../common/utils/campos-desativados.util';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarGastoDto } from './dto/gasto.dto';

const CATEGORIAS_PADRAO: string[] = Object.values(CategoriaGasto);

@Injectable()
export class GastosService {
  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

  listar(empresaId: string, loteId?: string) {
    return this.prisma.gasto.findMany({
      where: { empresaId, ...(loteId ? { loteId } : {}) },
      orderBy: { data: 'desc' },
    });
  }

  async criar(empresaId: string, dtoOriginal: CriarGastoDto) {
    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'gastos', camposDesativados);
    return this.prisma.$transaction(async (tx) => {
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
        await tx.movimentoInsumo.create({
          data: {
            empresaId,
            insumoId: dto.insumoId,
            tipo: TipoMovimentoInsumo.ENTRADA,
            quantidade: dto.quantidade,
            data: gasto.data,
            gastoId: gasto.id,
          },
        });
      }

      return gasto;
    });
  }

  async remover(empresaId: string, id: string) {
    await this.prisma.gasto.deleteMany({ where: { id, empresaId } });
    return { ok: true };
  }

  /**
   * Categorias além das padrão que a empresa já cadastrou via "Outros"
   * (categoria é texto livre — não existe tabela separada pra isso).
   */
  async categoriasCustomizadas(empresaId: string) {
    const gastos = await this.prisma.gasto.findMany({
      where: { empresaId, NOT: { categoria: { in: CATEGORIAS_PADRAO } } },
      distinct: ['categoria'],
      select: { categoria: true },
      orderBy: { categoria: 'asc' },
    });
    return gastos.map((g) => g.categoria);
  }

  /** Total de gastos agrupado por categoria (para o dashboard). */
  async totalPorCategoria(empresaId: string, loteId?: string) {
    const gastos = await this.prisma.gasto.groupBy({
      by: ['categoria'],
      where: { empresaId, ...(loteId ? { loteId } : {}) },
      _sum: { valor: true },
    });
    return gastos.map((g) => ({
      categoria: g.categoria,
      total: Number(g._sum.valor ?? 0),
    }));
  }
}
