import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { StatusAnimal } from '@pecus/shared';
import { removerCamposDesativados } from '../common/utils/campos-desativados.util';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarAnimalDto, AtualizarAnimalDto, DarSaidaAnimalDto } from './dto/animal.dto';

@Injectable()
export class AnimaisService {
  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

  private async garantirLoteDaEmpresa(empresaId: string, loteId: string) {
    const lote = await this.prisma.lote.findFirst({ where: { id: loteId, empresaId } });
    if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
  }

  private async garantirIdentificadorLivre(empresaId: string, identificador: string, ignorarId?: string) {
    const existente = await this.prisma.animal.findFirst({
      where: { empresaId, identificador, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
    });
    if (existente) {
      throw new ConflictException(['Já existe um animal com esse identificador nesta fazenda.']);
    }
  }

  listar(empresaId: string, filtros: { loteId?: string; status?: StatusAnimal }) {
    return this.prisma.animal.findMany({
      where: { empresaId, loteId: filtros.loteId, status: filtros.status },
      include: { lote: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detalhar(empresaId: string, id: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id, empresaId },
      include: { lote: true },
    });
    if (!animal) throw new NotFoundException('Animal não encontrado.');
    return animal;
  }

  async criar(empresaId: string, dtoOriginal: CriarAnimalDto) {
    await this.garantirLoteDaEmpresa(empresaId, dtoOriginal.loteId);
    await this.garantirIdentificadorLivre(empresaId, dtoOriginal.identificador);

    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'animais', camposDesativados);

    return this.prisma.animal.create({
      data: {
        empresaId,
        loteId: dto.loteId,
        identificador: dto.identificador,
        sexo: dto.sexo,
        categoria: dto.categoria,
        dataEntrada: new Date(dto.dataEntrada),
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
        pesoEntrada: dto.pesoEntrada,
        observacao: dto.observacao,
      },
    });
  }

  async atualizar(empresaId: string, id: string, dto: AtualizarAnimalDto) {
    await this.detalhar(empresaId, id);
    if (dto.loteId) await this.garantirLoteDaEmpresa(empresaId, dto.loteId);
    if (dto.identificador) await this.garantirIdentificadorLivre(empresaId, dto.identificador, id);

    return this.prisma.animal.update({
      where: { id },
      data: {
        ...dto,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      },
    });
  }

  async darSaida(empresaId: string, id: string, dto: DarSaidaAnimalDto) {
    await this.detalhar(empresaId, id);
    return this.prisma.animal.update({
      where: { id },
      data: {
        status: dto.status,
        dataSaida: new Date(dto.dataSaida),
        motivoSaida: dto.motivoSaida,
      },
    });
  }
}
