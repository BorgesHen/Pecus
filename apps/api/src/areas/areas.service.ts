import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAreaDto, AtualizarAreaDto } from './dto/area.dto';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.area.findMany({
      where: { empresaId },
      include: { _count: { select: { piquetes: true, lotes: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detalhar(empresaId: string, id: string) {
    const area = await this.prisma.area.findFirst({
      where: { id, empresaId },
      include: {
        piquetes: true,
        lotes: { select: { id: true, identificacao: true } },
      },
    });
    if (!area) throw new NotFoundException('Área não encontrada.');
    return area;
  }

  criar(empresaId: string, dto: CriarAreaDto) {
    return this.prisma.area.create({
      data: { empresaId, nome: dto.nome, areaHectares: dto.areaHectares },
    });
  }

  async atualizar(empresaId: string, id: string, dto: AtualizarAreaDto) {
    await this.detalhar(empresaId, id);
    return this.prisma.area.update({ where: { id }, data: dto });
  }

  async remover(empresaId: string, id: string) {
    await this.detalhar(empresaId, id);
    await this.prisma.area.delete({ where: { id } });
    return { ok: true };
  }
}
