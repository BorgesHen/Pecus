import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPesagemDto } from './dto/pesagem.dto';

@Injectable()
export class PesagensService {
  constructor(private prisma: PrismaService) {}

  /** Confirma que o lote pertence à empresa antes de mexer nas pesagens. */
  private async garantirLoteDaEmpresa(empresaId: string, loteId: string) {
    const lote = await this.prisma.lote.findFirst({ where: { id: loteId, empresaId } });
    if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
    return lote;
  }

  async listarPorLote(empresaId: string, loteId: string) {
    await this.garantirLoteDaEmpresa(empresaId, loteId);
    return this.prisma.pesagem.findMany({
      where: { loteId },
      orderBy: { data: 'asc' },
    });
  }

  async criar(empresaId: string, dto: CriarPesagemDto) {
    await this.garantirLoteDaEmpresa(empresaId, dto.loteId);
    return this.prisma.pesagem.create({
      data: {
        loteId: dto.loteId,
        data: new Date(dto.data),
        pesoMedio: dto.pesoMedio,
      },
    });
  }

  /**
   * Ganho Médio Diário (GMD) do lote com base na primeira e última pesagem
   * (ou peso de entrada, se houver). Retorna kg/dia.
   */
  async gmd(empresaId: string, loteId: string) {
    const lote = await this.garantirLoteDaEmpresa(empresaId, loteId);
    const pesagens = await this.prisma.pesagem.findMany({
      where: { loteId },
      orderBy: { data: 'asc' },
    });

    if (pesagens.length === 0) return { gmd: null, mensagem: 'Sem pesagens registradas.' };

    const primeira = pesagens[0];
    const ultima = pesagens[pesagens.length - 1];

    const pesoInicial = lote.pesoMedioEntrada ?? primeira.pesoMedio;
    const dataInicial = lote.pesoMedioEntrada ? lote.dataAquisicao : primeira.data;

    const dias = Math.max(
      1,
      Math.round((ultima.data.getTime() - dataInicial.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const gmd = (ultima.pesoMedio - pesoInicial) / dias;

    return {
      gmd: Number(gmd.toFixed(3)),
      pesoInicial,
      pesoAtual: ultima.pesoMedio,
      dias,
    };
  }
}
