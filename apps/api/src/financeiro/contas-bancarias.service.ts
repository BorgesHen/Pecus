import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaBancariaDto, AtualizarContaBancariaDto } from './dto/conta-bancaria.dto';

@Injectable()
export class ContasBancariasService {
  constructor(private prisma: PrismaService) {}

  private async garantirContaBancariaDaEmpresa(empresaId: string, id: string) {
    const conta = await this.prisma.contaBancaria.findFirst({ where: { id, empresaId } });
    if (!conta) throw new NotFoundException('Conta bancária não encontrada nesta empresa.');
    return conta;
  }

  listar(empresaId: string) {
    return this.prisma.contaBancaria.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  }

  criar(empresaId: string, dto: CriarContaBancariaDto) {
    return this.prisma.contaBancaria.create({
      data: {
        empresaId,
        nome: dto.nome,
        saldoInicial: dto.saldoInicial ?? 0,
        dataSaldoInicial: dto.dataSaldoInicial ? new Date(dto.dataSaldoInicial) : undefined,
      },
    });
  }

  async atualizar(empresaId: string, id: string, dto: AtualizarContaBancariaDto) {
    await this.garantirContaBancariaDaEmpresa(empresaId, id);
    return this.prisma.contaBancaria.update({
      where: { id },
      data: {
        ...dto,
        dataSaldoInicial: dto.dataSaldoInicial ? new Date(dto.dataSaldoInicial) : undefined,
      },
    });
  }

  async remover(empresaId: string, id: string) {
    await this.garantirContaBancariaDaEmpresa(empresaId, id);
    const lancamentos = await this.prisma.lancamento.count({ where: { contaBancariaId: id } });
    if (lancamentos > 0) {
      throw new BadRequestException(
        'Este banco já tem lançamentos vinculados — desative-o em vez de excluir.',
      );
    }
    await this.prisma.contaBancaria.delete({ where: { id } });
    return { ok: true };
  }
}
