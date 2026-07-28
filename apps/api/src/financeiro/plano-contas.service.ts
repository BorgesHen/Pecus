import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CriarGrupoFinanceiroDto,
  AtualizarGrupoFinanceiroDto,
} from './dto/grupo-financeiro.dto';
import { CriarContaFinanceiraDto, AtualizarContaFinanceiraDto } from './dto/conta-financeira.dto';

@Injectable()
export class PlanoContasService {
  constructor(private prisma: PrismaService) {}

  private async garantirGrupoDaEmpresa(empresaId: string, grupoId: string) {
    const grupo = await this.prisma.grupoFinanceiro.findFirst({
      where: { id: grupoId, empresaId },
    });
    if (!grupo) throw new NotFoundException('Grupo financeiro não encontrado nesta empresa.');
    return grupo;
  }

  private async garantirContaDaEmpresa(empresaId: string, contaId: string) {
    const conta = await this.prisma.contaFinanceira.findFirst({
      where: { id: contaId, grupo: { empresaId } },
    });
    if (!conta) throw new NotFoundException('Conta financeira não encontrada nesta empresa.');
    return conta;
  }

  listar(empresaId: string) {
    return this.prisma.grupoFinanceiro.findMany({
      where: { empresaId },
      include: { contas: { orderBy: { codigo: 'asc' } } },
      orderBy: { ordem: 'asc' },
    });
  }

  criarGrupo(empresaId: string, dto: CriarGrupoFinanceiroDto) {
    return this.prisma.grupoFinanceiro.create({
      data: {
        empresaId,
        natureza: dto.natureza,
        codigo: dto.codigo,
        nome: dto.nome,
        ordem: dto.ordem ?? 0,
      },
    });
  }

  async atualizarGrupo(empresaId: string, id: string, dto: AtualizarGrupoFinanceiroDto) {
    await this.garantirGrupoDaEmpresa(empresaId, id);
    return this.prisma.grupoFinanceiro.update({ where: { id }, data: dto });
  }

  async removerGrupo(empresaId: string, id: string) {
    await this.garantirGrupoDaEmpresa(empresaId, id);
    const contas = await this.prisma.contaFinanceira.count({ where: { grupoId: id } });
    if (contas > 0) {
      throw new BadRequestException('Remova ou mova as contas deste grupo antes de excluí-lo.');
    }
    await this.prisma.grupoFinanceiro.delete({ where: { id } });
    return { ok: true };
  }

  async criarConta(empresaId: string, dto: CriarContaFinanceiraDto) {
    await this.garantirGrupoDaEmpresa(empresaId, dto.grupoId);
    return this.prisma.contaFinanceira.create({
      data: { grupoId: dto.grupoId, codigo: dto.codigo, nome: dto.nome },
    });
  }

  async atualizarConta(empresaId: string, id: string, dto: AtualizarContaFinanceiraDto) {
    await this.garantirContaDaEmpresa(empresaId, id);
    return this.prisma.contaFinanceira.update({ where: { id }, data: dto });
  }

  async removerConta(empresaId: string, id: string) {
    await this.garantirContaDaEmpresa(empresaId, id);
    const lancamentos = await this.prisma.lancamento.count({ where: { contaId: id } });
    if (lancamentos > 0) {
      throw new BadRequestException(
        'Esta conta já tem lançamentos vinculados — desative-a em vez de excluir.',
      );
    }
    await this.prisma.contaFinanceira.delete({ where: { id } });
    return { ok: true };
  }
}
