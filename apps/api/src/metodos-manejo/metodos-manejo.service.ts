import { ConflictException, Injectable } from '@nestjs/common';
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
      data: { nome: dto.nome, empresaId, tipo: dto.tipo },
    });
  }

  /** Só remove métodos customizados da própria empresa (nunca os globais). */
  async remover(empresaId: string, id: string) {
    const emUsoNoHistorico = await this.prisma.loteMetodoHistorico.findFirst({
      where: { metodoManejoId: id },
    });
    if (emUsoNoHistorico) {
      throw new ConflictException([
        'Este método já foi usado por algum lote (aparece no histórico) e não pode ser excluído.',
      ]);
    }
    await this.prisma.metodoManejo.deleteMany({ where: { id, empresaId } });
    return { ok: true };
  }
}
