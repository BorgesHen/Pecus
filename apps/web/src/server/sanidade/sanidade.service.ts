import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusAnimal } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import type { CriarEventoSanitarioDto, AplicarEmMassaDto } from './dto';

async function garantirAnimalDaEmpresa(empresaId: string, animalId: string) {
  const animal = await prisma.animal.findFirst({ where: { id: animalId, empresaId } });
  if (!animal) throw new NotFoundException('Animal não encontrado nesta empresa.');
}

export function listarPorAnimal(empresaId: string, animalId: string) {
  return prisma.eventoSanitario.findMany({ where: { empresaId, animalId }, orderBy: { data: 'desc' } });
}

export async function criar(empresaId: string, dtoOriginal: CriarEventoSanitarioDto) {
  await garantirAnimalDaEmpresa(empresaId, dtoOriginal.animalId);
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'sanidade', camposDesativados);
  return prisma.eventoSanitario.create({
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
export async function aplicarEmMassa(empresaId: string, dto: AplicarEmMassaDto) {
  let animalIds = dto.animalIds ?? [];

  if (dto.loteId) {
    const animaisDoLote = await prisma.animal.findMany({
      where: { empresaId, loteId: dto.loteId, status: StatusAnimal.ATIVO },
      select: { id: true },
    });
    animalIds = [...new Set([...animalIds, ...animaisDoLote.map((a) => a.id)])];
  }

  if (animalIds.length === 0) throw new BadRequestException('Informe um lote ou ao menos um animal.');

  const animaisValidos = await prisma.animal.count({ where: { empresaId, id: { in: animalIds } } });
  if (animaisValidos !== animalIds.length) throw new NotFoundException('Um ou mais animais não pertencem a esta empresa.');

  const data = new Date(dto.data);
  const proximaAplicacao = dto.proximaAplicacao ? new Date(dto.proximaAplicacao) : undefined;

  await prisma.eventoSanitario.createMany({
    data: animalIds.map((animalId) => ({ empresaId, animalId, tipo: dto.tipo, nome: dto.nome, data, proximaAplicacao, observacao: dto.observacao })),
  });

  return { ok: true, animaisAfetados: animalIds.length };
}

/** Eventos vencidos e os que vencem nos próximos `dias`. Sem `dias`, usa o padrão da fazenda. */
export async function proximosVencimentos(empresaId: string, dias?: number) {
  if (dias === undefined) {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { sanidadeDiasAvisoVencimento: true } });
    dias = empresa?.sanidadeDiasAvisoVencimento ?? 7;
  }

  const hoje = new Date();
  const limite = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000);

  const eventos = await prisma.eventoSanitario.findMany({
    where: { empresaId, proximaAplicacao: { not: null, lte: limite } },
    include: { animal: true },
    orderBy: { proximaAplicacao: 'asc' },
  });

  return {
    vencidos: eventos.filter((e) => e.proximaAplicacao! < hoje),
    proximos: eventos.filter((e) => e.proximaAplicacao! >= hoje),
  };
}

export function historicoRecente(empresaId: string, limite = 20) {
  return prisma.eventoSanitario.findMany({ where: { empresaId }, include: { animal: true }, orderBy: { data: 'desc' }, take: limite });
}
