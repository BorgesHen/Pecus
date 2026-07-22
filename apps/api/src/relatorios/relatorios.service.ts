import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RelatoriosService {
  constructor(private prisma: PrismaService) {}

  /** Visão geral da fazenda para o dashboard. */
  async dashboard(empresaId: string) {
    const [lotes, totalGasto, gastosPorCategoria] = await Promise.all([
      this.prisma.lote.count({ where: { empresaId } }),
      this.prisma.gasto.aggregate({ where: { empresaId }, _sum: { valor: true } }),
      this.prisma.gasto.groupBy({
        by: ['categoria'],
        where: { empresaId },
        _sum: { valor: true },
      }),
    ]);

    const animais = await this.prisma.lote.aggregate({
      where: { empresaId },
      _sum: { quantidadeAnimais: true },
    });

    return {
      totalLotes: lotes,
      totalAnimais: animais._sum.quantidadeAnimais ?? 0,
      totalGasto: Number(totalGasto._sum.valor ?? 0),
      gastosPorCategoria: gastosPorCategoria.map((g) => ({
        categoria: g.categoria,
        total: Number(g._sum.valor ?? 0),
      })),
    };
  }

  /**
   * Custo por arroba (@) de um lote. Arroba = 15 kg de peso vivo (padrão BR).
   * Estimativa simples: custo total do lote / (peso total ganho em @).
   */
  async custoPorArroba(empresaId: string, loteId: string) {
    const lote = await this.prisma.lote.findFirst({
      where: { id: loteId, empresaId },
      include: { pesagens: { orderBy: { data: 'asc' } }, gastos: true },
    });
    if (!lote) return { erro: 'Lote não encontrado.' };

    const custoTotal = lote.gastos.reduce((acc, g) => acc + Number(g.valor), 0);

    const pesoEntrada = lote.pesoMedioEntrada ?? lote.pesagens[0]?.pesoMedio ?? 0;
    const pesoAtual = lote.pesagens[lote.pesagens.length - 1]?.pesoMedio ?? pesoEntrada;
    const ganhoKgPorAnimal = pesoAtual - pesoEntrada;
    const ganhoTotalKg = ganhoKgPorAnimal * lote.quantidadeAnimais;
    const ganhoArrobas = ganhoTotalKg / 15;

    return {
      custoTotal,
      ganhoKgPorAnimal,
      ganhoTotalKg,
      ganhoArrobas: Number(ganhoArrobas.toFixed(2)),
      custoPorArroba: ganhoArrobas > 0 ? Number((custoTotal / ganhoArrobas).toFixed(2)) : null,
    };
  }
}
