import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoMovimentoInsumo } from '@pecus/shared';
import { removerCamposDesativados } from '../common/utils/campos-desativados.util';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarInsumoDto, AtualizarInsumoDto, RegistrarConsumoDto } from './dto/insumo.dto';

@Injectable()
export class InsumosService {
  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

  private async calcularSaldo(insumoId: string) {
    const [entradas, saidas] = await Promise.all([
      this.prisma.movimentoInsumo.aggregate({
        where: { insumoId, tipo: TipoMovimentoInsumo.ENTRADA },
        _sum: { quantidade: true },
      }),
      this.prisma.movimentoInsumo.aggregate({
        where: { insumoId, tipo: TipoMovimentoInsumo.SAIDA },
        _sum: { quantidade: true },
      }),
    ]);
    return (entradas._sum.quantidade ?? 0) - (saidas._sum.quantidade ?? 0);
  }

  async listar(empresaId: string) {
    const insumos = await this.prisma.insumo.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
    return Promise.all(
      insumos.map(async (insumo) => ({ ...insumo, saldoAtual: await this.calcularSaldo(insumo.id) })),
    );
  }

  async detalhar(empresaId: string, id: string) {
    const insumo = await this.prisma.insumo.findFirst({ where: { id, empresaId } });
    if (!insumo) throw new NotFoundException('Insumo não encontrado.');
    return { ...insumo, saldoAtual: await this.calcularSaldo(id) };
  }

  async criar(empresaId: string, dtoOriginal: CriarInsumoDto) {
    const existente = await this.prisma.insumo.findFirst({ where: { empresaId, nome: dtoOriginal.nome } });
    if (existente) throw new ConflictException(['Já existe um insumo com esse nome nesta fazenda.']);

    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'estoque', camposDesativados);

    return this.prisma.insumo.create({
      data: { empresaId, nome: dto.nome, unidade: dto.unidade, estoqueMinimo: dto.estoqueMinimo },
    });
  }

  async atualizar(empresaId: string, id: string, dtoOriginal: AtualizarInsumoDto) {
    await this.detalhar(empresaId, id);
    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'estoque', camposDesativados);
    return this.prisma.insumo.update({ where: { id }, data: dto });
  }

  listarMovimentos(empresaId: string, insumoId: string) {
    return this.prisma.movimentoInsumo.findMany({
      where: { empresaId, insumoId },
      orderBy: { data: 'desc' },
    });
  }

  async registrarConsumo(empresaId: string, insumoId: string, dto: RegistrarConsumoDto) {
    await this.detalhar(empresaId, insumoId);
    return this.prisma.movimentoInsumo.create({
      data: {
        empresaId,
        insumoId,
        tipo: TipoMovimentoInsumo.SAIDA,
        quantidade: dto.quantidade,
        data: new Date(dto.data),
        observacao: dto.observacao,
      },
    });
  }
}
