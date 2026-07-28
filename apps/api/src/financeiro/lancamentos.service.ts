import { Injectable, NotFoundException } from '@nestjs/common';
import { NaturezaFinanceira, StatusLancamento } from '@pecus/shared';
import { removerCamposDesativados } from '../common/utils/campos-desativados.util';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarLancamentoDto, LiquidarLancamentoDto } from './dto/lancamento.dto';

export interface FiltrosLancamento {
  natureza?: NaturezaFinanceira;
  loteId?: string;
  contaId?: string;
  de?: string;
  ate?: string;
  status?: 'aberto' | 'liquidado';
}

function adicionarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}

/** Divide o valor total em N parcelas iguais, jogando o resto de centavos na última — soma sempre bate. */
function calcularValoresParcelas(valorTotal: number, totalParcelas: number): number[] {
  const centavosTotal = Math.round(valorTotal * 100);
  const base = Math.floor(centavosTotal / totalParcelas);
  const resto = centavosTotal - base * totalParcelas;
  return Array.from({ length: totalParcelas }, (_, i) => (i === totalParcelas - 1 ? base + resto : base) / 100);
}

function calcularStatus(dataVencimento: Date, dataLiquidacao: Date | null): StatusLancamento {
  if (dataLiquidacao) return StatusLancamento.LIQUIDADO;
  return dataVencimento < new Date() ? StatusLancamento.ATRASADO : StatusLancamento.EM_ABERTO;
}

@Injectable()
export class LancamentosService {
  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

  private async garantirContaDaEmpresa(empresaId: string, contaId: string) {
    const conta = await this.prisma.contaFinanceira.findFirst({
      where: { id: contaId, grupo: { empresaId } },
    });
    if (!conta) throw new NotFoundException('Conta financeira não encontrada nesta empresa.');
  }

  private async garantirLoteDaEmpresa(empresaId: string, loteId: string) {
    const lote = await this.prisma.lote.findFirst({ where: { id: loteId, empresaId } });
    if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
  }

  private async garantirContatoDaEmpresa(empresaId: string, contatoId: string) {
    const contato = await this.prisma.contato.findFirst({ where: { id: contatoId, empresaId } });
    if (!contato) throw new NotFoundException('Contato não encontrado nesta empresa.');
  }

  private async garantirContaBancariaDaEmpresa(empresaId: string, contaBancariaId: string) {
    const conta = await this.prisma.contaBancaria.findFirst({
      where: { id: contaBancariaId, empresaId },
    });
    if (!conta) throw new NotFoundException('Conta bancária não encontrada nesta empresa.');
  }

  private async garantirLancamentoDaEmpresa(empresaId: string, id: string) {
    const lancamento = await this.prisma.lancamento.findFirst({ where: { id, empresaId } });
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado nesta empresa.');
    return lancamento;
  }

  async listar(empresaId: string, filtros: FiltrosLancamento) {
    const where: Record<string, unknown> = { empresaId };
    if (filtros.loteId) where.loteId = filtros.loteId;
    if (filtros.contaId) where.contaId = filtros.contaId;
    if (filtros.natureza) where.conta = { grupo: { natureza: filtros.natureza } };
    if (filtros.de || filtros.ate) {
      where.dataDocumento = {
        ...(filtros.de ? { gte: new Date(filtros.de) } : {}),
        ...(filtros.ate ? { lte: new Date(filtros.ate) } : {}),
      };
    }
    if (filtros.status === 'liquidado') where.dataLiquidacao = { not: null };
    else if (filtros.status === 'aberto') where.dataLiquidacao = null;

    const lancamentos = await this.prisma.lancamento.findMany({
      where,
      include: {
        conta: { include: { grupo: true } },
        lote: { select: { id: true, identificacao: true } },
        contato: true,
        contaBancaria: true,
      },
      orderBy: { dataVencimento: 'asc' },
    });

    return lancamentos.map((l) => ({
      ...l,
      status: calcularStatus(l.dataVencimento, l.dataLiquidacao),
    }));
  }

  contasAPagar(empresaId: string) {
    return this.listar(empresaId, { natureza: NaturezaFinanceira.DESPESA, status: 'aberto' });
  }

  contasAReceber(empresaId: string) {
    return this.listar(empresaId, { natureza: NaturezaFinanceira.RECEITA, status: 'aberto' });
  }

  async criar(empresaId: string, dtoOriginal: CriarLancamentoDto) {
    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'lancamentos', camposDesativados);

    await this.garantirContaDaEmpresa(empresaId, dto.contaId);
    if (dto.loteId) await this.garantirLoteDaEmpresa(empresaId, dto.loteId);
    if (dto.contatoId) await this.garantirContatoDaEmpresa(empresaId, dto.contatoId);
    if (dto.contaBancariaId) await this.garantirContaBancariaDaEmpresa(empresaId, dto.contaBancariaId);

    const totalParcelas = dto.totalParcelas ?? 1;
    const valoresParcelas = calcularValoresParcelas(dto.valorTotal, totalParcelas);
    const dataDocumento = new Date(dto.dataDocumento);
    const dataVencimentoBase = new Date(dto.dataVencimento);
    const dataLiquidacaoPrimeiraParcela = dto.dataLiquidacao ? new Date(dto.dataLiquidacao) : null;

    return this.prisma.$transaction((tx) =>
      Promise.all(
        valoresParcelas.map((valorParcela, indice) =>
          tx.lancamento.create({
            data: {
              empresaId,
              contaId: dto.contaId,
              loteId: dto.loteId,
              contatoId: dto.contatoId,
              contaBancariaId: dto.contaBancariaId,
              formaPagamento: dto.formaPagamento,
              descricao: dto.descricao,
              documento: dto.documento,
              valorTotal: dto.valorTotal,
              totalParcelas,
              numeroParcela: indice + 1,
              valorParcela,
              dataDocumento,
              dataVencimento: adicionarMeses(dataVencimentoBase, indice),
              dataLiquidacao: indice === 0 ? dataLiquidacaoPrimeiraParcela : null,
            },
          }),
        ),
      ),
    );
  }

  async liquidar(empresaId: string, id: string, dto: LiquidarLancamentoDto) {
    await this.garantirLancamentoDaEmpresa(empresaId, id);
    if (dto.contaBancariaId) await this.garantirContaBancariaDaEmpresa(empresaId, dto.contaBancariaId);
    return this.prisma.lancamento.update({
      where: { id },
      data: {
        dataLiquidacao: new Date(dto.dataLiquidacao),
        contaBancariaId: dto.contaBancariaId,
      },
    });
  }

  async remover(empresaId: string, id: string) {
    await this.garantirLancamentoDaEmpresa(empresaId, id);
    await this.prisma.lancamento.delete({ where: { id } });
    return { ok: true };
  }
}
