import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StatusAnimal } from '@pecus/shared';
import { removerCamposDesativados } from '../common/utils/campos-desativados.util';
import { EmpresasService } from '../empresas/empresas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CriarEventoSanitarioDto, AplicarEmMassaDto } from './dto/evento-sanitario.dto';

@Injectable()
export class SanidadeService {
  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

  private async garantirAnimalDaEmpresa(empresaId: string, animalId: string) {
    const animal = await this.prisma.animal.findFirst({ where: { id: animalId, empresaId } });
    if (!animal) throw new NotFoundException('Animal não encontrado nesta empresa.');
  }

  listarPorAnimal(empresaId: string, animalId: string) {
    return this.prisma.eventoSanitario.findMany({
      where: { empresaId, animalId },
      orderBy: { data: 'desc' },
    });
  }

  async criar(empresaId: string, dtoOriginal: CriarEventoSanitarioDto) {
    await this.garantirAnimalDaEmpresa(empresaId, dtoOriginal.animalId);
    const camposDesativados = await this.empresasService.obterCamposDesativados(empresaId);
    const dto = removerCamposDesativados(dtoOriginal, 'sanidade', camposDesativados);
    return this.prisma.eventoSanitario.create({
      data: {
        empresaId,
        animalId: dto.animalId,
        tipo: dto.tipo,
        nome: dto.nome,
        data: new Date(dto.data),
        proximaAplicacao: dto.proximaAplicacao ? new Date(dto.proximaAplicacao) : undefined,
        observacao: dto.observacao,
      },
    });
  }

  /** Aplica o mesmo evento em todos os animais ativos de um lote, ou numa lista explícita de animais. */
  async aplicarEmMassa(empresaId: string, dto: AplicarEmMassaDto) {
    let animalIds = dto.animalIds ?? [];

    if (dto.loteId) {
      const animaisDoLote = await this.prisma.animal.findMany({
        where: { empresaId, loteId: dto.loteId, status: StatusAnimal.ATIVO },
        select: { id: true },
      });
      animalIds = [...new Set([...animalIds, ...animaisDoLote.map((a) => a.id)])];
    }

    if (animalIds.length === 0) {
      throw new BadRequestException('Informe um lote ou ao menos um animal.');
    }

    const animaisValidos = await this.prisma.animal.count({
      where: { empresaId, id: { in: animalIds } },
    });
    if (animaisValidos !== animalIds.length) {
      throw new NotFoundException('Um ou mais animais não pertencem a esta empresa.');
    }

    const data = new Date(dto.data);
    const proximaAplicacao = dto.proximaAplicacao ? new Date(dto.proximaAplicacao) : undefined;

    await this.prisma.eventoSanitario.createMany({
      data: animalIds.map((animalId) => ({
        empresaId,
        animalId,
        tipo: dto.tipo,
        nome: dto.nome,
        data,
        proximaAplicacao,
        observacao: dto.observacao,
      })),
    });

    return { ok: true, animaisAfetados: animalIds.length };
  }

  /**
   * Eventos vencidos e os que vencem nos próximos `dias` — alimenta o dashboard e a tela de
   * Sanidade. Sem `dias` explícito, usa o padrão configurado pela fazenda (Configurações).
   */
  async proximosVencimentos(empresaId: string, dias?: number) {
    if (dias === undefined) {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: empresaId },
        select: { sanidadeDiasAvisoVencimento: true },
      });
      dias = empresa?.sanidadeDiasAvisoVencimento ?? 7;
    }

    const hoje = new Date();
    const limite = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000);

    const eventos = await this.prisma.eventoSanitario.findMany({
      where: { empresaId, proximaAplicacao: { not: null, lte: limite } },
      include: { animal: true },
      orderBy: { proximaAplicacao: 'asc' },
    });

    return {
      vencidos: eventos.filter((e) => e.proximaAplicacao! < hoje),
      proximos: eventos.filter((e) => e.proximaAplicacao! >= hoje),
    };
  }

  historicoRecente(empresaId: string, limite = 20) {
    return this.prisma.eventoSanitario.findMany({
      where: { empresaId },
      include: { animal: true },
      orderBy: { data: 'desc' },
      take: limite,
    });
  }
}
