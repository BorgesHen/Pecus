import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarLoteDto, AtualizarLoteDto } from './dto/lote.dto';

@Injectable()
export class LotesService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.lote.findMany({
      where: { empresaId },
      include: { metodoManejo: true, _count: { select: { pesagens: true, gastos: true } } },
      orderBy: { dataAquisicao: 'desc' },
    });
  }

  async detalhar(empresaId: string, id: string) {
    const lote = await this.prisma.lote.findFirst({
      where: { id, empresaId },
      include: {
        metodoManejo: true,
        pesagens: { orderBy: { data: 'asc' } },
        gastos: { orderBy: { data: 'desc' } },
      },
    });
    if (!lote) throw new NotFoundException('Lote não encontrado.');
    return lote;
  }

  criar(empresaId: string, dto: CriarLoteDto) {
    return this.prisma.lote.create({
      data: {
        empresaId,
        identificacao: dto.identificacao,
        dataAquisicao: new Date(dto.dataAquisicao),
        quantidadeAnimais: dto.quantidadeAnimais,
        pesoMedioEntrada: dto.pesoMedioEntrada,
        metodoManejoId: dto.metodoManejoId,
      },
    });
  }

  async atualizar(empresaId: string, id: string, dto: AtualizarLoteDto) {
    await this.detalhar(empresaId, id);
    return this.prisma.lote.update({
      where: { id },
      data: {
        ...dto,
        dataAquisicao: dto.dataAquisicao ? new Date(dto.dataAquisicao) : undefined,
      },
    });
  }

  async remover(empresaId: string, id: string) {
    await this.detalhar(empresaId, id);
    await this.prisma.lote.delete({ where: { id } });
    return { ok: true };
  }
}
