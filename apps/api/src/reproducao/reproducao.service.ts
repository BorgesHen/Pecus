import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriaAnimal, SexoAnimal, StatusAnimal, TipoEventoReprodutivo } from '@pecus/shared';
import { removerCamposDesativados } from '../common/utils/campos-desativados.util';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEventoReprodutivoDto } from './dto/evento-reprodutivo.dto';

const CATEGORIAS_REPRODUTIVAS: CategoriaAnimal[] = [
  CategoriaAnimal.MATRIZ,
  CategoriaAnimal.VACA,
  CategoriaAnimal.TOURO,
];

@Injectable()
export class ReproducaoService {
  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

  private async garantirAnimalDaEmpresa(empresaId: string, animalId: string) {
    const animal = await this.prisma.animal.findFirst({ where: { id: animalId, empresaId } });
    if (!animal) throw new NotFoundException('Animal não encontrado nesta empresa.');
    return animal;
  }

  listarPorAnimal(empresaId: string, animalId: string) {
    return this.prisma.eventoReprodutivo.findMany({
      where: { empresaId, animalId },
      include: { cria: true },
      orderBy: { data: 'desc' },
    });
  }

  async criar(empresaId: string, dtoOriginal: CriarEventoReprodutivoDto) {
    const mae = await this.garantirAnimalDaEmpresa(empresaId, dtoOriginal.animalId);

    if (dtoOriginal.criaId) {
      await this.garantirAnimalDaEmpresa(empresaId, dtoOriginal.criaId);
    }

    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'reproducao', camposDesativados);

    return this.prisma.$transaction(async (tx) => {
      let criaId = dto.criaId;

      if (!criaId && dto.tipo === TipoEventoReprodutivo.PARTO && dto.criaIdentificador) {
        const cria = await tx.animal.create({
          data: {
            empresaId,
            loteId: dto.criaLoteId ?? mae.loteId,
            identificador: dto.criaIdentificador,
            sexo: dto.criaSexo ?? SexoAnimal.FEMEA,
            categoria: CategoriaAnimal.BEZERRO,
            dataNascimento: new Date(dto.data),
            dataEntrada: new Date(dto.data),
            status: StatusAnimal.ATIVO,
          },
        });
        criaId = cria.id;
      }

      return tx.eventoReprodutivo.create({
        data: {
          empresaId,
          animalId: dto.animalId,
          tipo: dto.tipo,
          data: new Date(dto.data),
          resultado: dto.resultado,
          observacao: dto.observacao,
          criaId,
        },
      });
    });
  }

  /** Matrizes/touros ativos com o status reprodutivo derivado do último diagnóstico de gestação. */
  async listarMatrizes(empresaId: string) {
    const animais = await this.prisma.animal.findMany({
      where: { empresaId, categoria: { in: CATEGORIAS_REPRODUTIVAS }, status: StatusAnimal.ATIVO },
      include: { lote: true },
      orderBy: { identificador: 'asc' },
    });

    return Promise.all(
      animais.map(async (animal) => {
        const [ultimoDiagnostico, ultimoEvento] = await Promise.all([
          this.prisma.eventoReprodutivo.findFirst({
            where: { animalId: animal.id, tipo: TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO },
            orderBy: { data: 'desc' },
          }),
          this.prisma.eventoReprodutivo.findFirst({
            where: { animalId: animal.id },
            orderBy: { data: 'desc' },
          }),
        ]);

        return {
          ...animal,
          statusReprodutivo: ultimoDiagnostico?.resultado ?? null,
          ultimoEvento: ultimoEvento
            ? { tipo: ultimoEvento.tipo, data: ultimoEvento.data }
            : null,
        };
      }),
    );
  }
}
