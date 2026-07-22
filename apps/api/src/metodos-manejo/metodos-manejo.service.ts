import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarMetodoManejoDto } from './dto/metodo-manejo.dto';

@Injectable()
export class MetodosManejoService {
  constructor(private prisma: PrismaService) {}

  /** Retorna os métodos globais (seed) + os customizados da empresa. */
  listar(empresaId: string) {
    return this.prisma.metodoManejo.findMany({
      where: { OR: [{ empresaId: null }, { empresaId }] },
      orderBy: { nome: 'asc' },
    });
  }

  criar(empresaId: string, dto: CriarMetodoManejoDto) {
    return this.prisma.metodoManejo.create({
      data: { nome: dto.nome, empresaId },
    });
  }

  /** Só remove métodos customizados da própria empresa (nunca os globais). */
  async remover(empresaId: string, id: string) {
    await this.prisma.metodoManejo.deleteMany({ where: { id, empresaId } });
    return { ok: true };
  }
}
