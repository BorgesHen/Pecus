import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { removerCamposDesativados } from '../common/utils/campos-desativados.util';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarLoteDto, AtualizarLoteDto, TrocarMetodoLoteDto } from './dto/lote.dto';

@Injectable()
export class LotesService {
  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

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
        metodoHistorico: { include: { metodoManejo: true }, orderBy: { dataInicio: 'desc' } },
      },
    });
    if (!lote) throw new NotFoundException('Lote não encontrado.');
    return lote;
  }

  async criar(empresaId: string, dtoOriginal: CriarLoteDto) {
    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'lotes', camposDesativados);
    const dataAquisicao = new Date(dto.dataAquisicao);
    return this.prisma.$transaction(async (tx) => {
      const lote = await tx.lote.create({
        data: {
          empresaId,
          identificacao: dto.identificacao,
          dataAquisicao,
          quantidadeAnimais: dto.quantidadeAnimais,
          pesoMedioEntrada: dto.pesoMedioEntrada,
          metodoManejoId: dto.metodoManejoId,
          rendimentoCarcaca: dto.rendimentoCarcaca,
          areaHectares: dto.areaHectares,
          gmdEsperado: dto.gmdEsperado,
        },
      });

      if (dto.metodoManejoId) {
        await tx.loteMetodoHistorico.create({
          data: { loteId: lote.id, metodoManejoId: dto.metodoManejoId, dataInicio: dataAquisicao },
        });
      }

      return lote;
    });
  }

  async atualizar(empresaId: string, id: string, dtoOriginal: AtualizarLoteDto) {
    await this.detalhar(empresaId, id);
    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'lotes', camposDesativados);
    return this.prisma.lote.update({
      where: { id },
      data: {
        ...dto,
        dataAquisicao: dto.dataAquisicao ? new Date(dto.dataAquisicao) : undefined,
      },
    });
  }

  /** Troca o método de manejo do lote, fechando a fase atual e abrindo uma nova no histórico. */
  async trocarMetodo(empresaId: string, id: string, dto: TrocarMetodoLoteDto) {
    const lote = await this.detalhar(empresaId, id);
    const dataTroca = new Date(dto.dataTroca);

    const faseAberta = lote.metodoHistorico.find((h) => h.dataFim === null);
    if (faseAberta && dataTroca < faseAberta.dataInicio) {
      throw new BadRequestException(
        'A data da troca não pode ser anterior ao início da fase atual.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (faseAberta) {
        await tx.loteMetodoHistorico.update({
          where: { id: faseAberta.id },
          data: { dataFim: dataTroca },
        });
      }

      await tx.loteMetodoHistorico.create({
        data: { loteId: id, metodoManejoId: dto.metodoManejoId, dataInicio: dataTroca },
      });

      return tx.lote.update({
        where: { id },
        data: { metodoManejoId: dto.metodoManejoId },
      });
    });
  }

  async remover(empresaId: string, id: string) {
    await this.detalhar(empresaId, id);
    await this.prisma.lote.delete({ where: { id } });
    return { ok: true };
  }
}
