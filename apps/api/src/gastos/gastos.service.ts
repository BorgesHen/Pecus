import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarGastoDto } from './dto/gasto.dto';

@Injectable()
export class GastosService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string, loteId?: string) {
    return this.prisma.gasto.findMany({
      where: { empresaId, ...(loteId ? { loteId } : {}) },
      orderBy: { data: 'desc' },
    });
  }

  criar(empresaId: string, dto: CriarGastoDto) {
    return this.prisma.gasto.create({
      data: {
        empresaId,
        categoria: dto.categoria,
        valor: dto.valor,
        data: new Date(dto.data),
        loteId: dto.loteId,
        descricao: dto.descricao,
        quantidade: dto.quantidade,
        unidade: dto.unidade,
      },
    });
  }

  async remover(empresaId: string, id: string) {
    await this.prisma.gasto.deleteMany({ where: { id, empresaId } });
    return { ok: true };
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
