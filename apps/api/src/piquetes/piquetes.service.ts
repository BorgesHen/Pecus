import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarPiqueteDto, AtualizarPiqueteDto, RegistrarAlturaDto, MoverGadoDto } from './dto/piquete.dto';

@Injectable()
export class PiquetesService {
  constructor(private prisma: PrismaService) {}

  private async garantirLoteDaEmpresa(empresaId: string, loteId: string) {
    const lote = await this.prisma.lote.findFirst({ where: { id: loteId, empresaId } });
    if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
  }

  private async garantirPiqueteDaEmpresa(empresaId: string, piqueteId: string) {
    const piquete = await this.prisma.piquete.findFirst({
      where: { id: piqueteId, lote: { empresaId } },
    });
    if (!piquete) throw new NotFoundException('Piquete não encontrado nesta empresa.');
    return piquete;
  }

  async listarPorLote(empresaId: string, loteId: string) {
    await this.garantirLoteDaEmpresa(empresaId, loteId);

    const [piquetes, empresa] = await Promise.all([
      this.prisma.piquete.findMany({
        where: { loteId },
        include: {
          registrosAltura: { orderBy: { data: 'desc' }, take: 1 },
          ocupacoes: { where: { dataFim: null } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.empresa.findUnique({ where: { id: empresaId }, select: { alturaIdealPastoPadrao: true } }),
    ]);
    const alturaIdealPastoPadrao = empresa?.alturaIdealPastoPadrao ?? 60;

    return piquetes.map(({ registrosAltura, ocupacoes, ...piquete }) => ({
      ...piquete,
      ultimaAltura: registrosAltura[0] ?? null,
      ocupadoAtualmente: ocupacoes.length > 0,
      alturaIdealEfetiva: piquete.alturaIdealCm ?? alturaIdealPastoPadrao,
    }));
  }

  async criar(empresaId: string, dto: CriarPiqueteDto) {
    await this.garantirLoteDaEmpresa(empresaId, dto.loteId);
    return this.prisma.piquete.create({
      data: {
        loteId: dto.loteId,
        nome: dto.nome,
        areaHectares: dto.areaHectares,
        alturaIdealCm: dto.alturaIdealCm,
      },
    });
  }

  async atualizar(empresaId: string, id: string, dto: AtualizarPiqueteDto) {
    await this.garantirPiqueteDaEmpresa(empresaId, id);
    return this.prisma.piquete.update({ where: { id }, data: dto });
  }

  async remover(empresaId: string, id: string) {
    await this.garantirPiqueteDaEmpresa(empresaId, id);
    await this.prisma.piquete.delete({ where: { id } });
    return { ok: true };
  }

  async registrarAltura(empresaId: string, piqueteId: string, dto: RegistrarAlturaDto) {
    await this.garantirPiqueteDaEmpresa(empresaId, piqueteId);
    return this.prisma.registroAlturaPasto.create({
      data: { piqueteId, data: new Date(dto.data), alturaCm: dto.alturaCm },
    });
  }

  async listarAlturas(empresaId: string, piqueteId: string) {
    await this.garantirPiqueteDaEmpresa(empresaId, piqueteId);
    return this.prisma.registroAlturaPasto.findMany({
      where: { piqueteId },
      orderBy: { data: 'desc' },
    });
  }

  /** Fecha a ocupação aberta de qualquer piquete do lote e abre uma nova neste — só um piquete concentra o gado por vez. */
  async moverGado(empresaId: string, piqueteId: string, dto: MoverGadoDto) {
    const piqueteDestino = await this.garantirPiqueteDaEmpresa(empresaId, piqueteId);
    const dataMovimento = new Date(dto.data);

    return this.prisma.$transaction(async (tx) => {
      const ocupacaoAberta = await tx.ocupacaoPiquete.findFirst({
        where: { piquete: { loteId: piqueteDestino.loteId }, dataFim: null },
      });

      if (ocupacaoAberta) {
        if (ocupacaoAberta.piqueteId === piqueteId) {
          throw new BadRequestException('O gado já está neste piquete.');
        }
        await tx.ocupacaoPiquete.update({ where: { id: ocupacaoAberta.id }, data: { dataFim: dataMovimento } });
      }

      return tx.ocupacaoPiquete.create({ data: { piqueteId, dataInicio: dataMovimento } });
    });
  }
}
