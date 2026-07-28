import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoContato } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContatoDto, AtualizarContatoDto } from './dto/contato.dto';

@Injectable()
export class ContatosService {
  constructor(private prisma: PrismaService) {}

  private async garantirContatoDaEmpresa(empresaId: string, id: string) {
    const contato = await this.prisma.contato.findFirst({ where: { id, empresaId } });
    if (!contato) throw new NotFoundException('Contato não encontrado nesta empresa.');
    return contato;
  }

  listar(empresaId: string, tipo?: TipoContato) {
    return this.prisma.contato.findMany({
      where: { empresaId, tipo },
      orderBy: { nome: 'asc' },
    });
  }

  criar(empresaId: string, dto: CriarContatoDto) {
    return this.prisma.contato.create({ data: { empresaId, ...dto } });
  }

  async atualizar(empresaId: string, id: string, dto: AtualizarContatoDto) {
    await this.garantirContatoDaEmpresa(empresaId, id);
    return this.prisma.contato.update({ where: { id }, data: dto });
  }

  async remover(empresaId: string, id: string) {
    await this.garantirContatoDaEmpresa(empresaId, id);
    const lancamentos = await this.prisma.lancamento.count({ where: { contatoId: id } });
    if (lancamentos > 0) {
      throw new BadRequestException('Este contato já tem lançamentos vinculados — não pode ser excluído.');
    }
    await this.prisma.contato.delete({ where: { id } });
    return { ok: true };
  }
}
