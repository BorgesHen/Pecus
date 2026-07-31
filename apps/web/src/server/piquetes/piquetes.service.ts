import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma';
import { garantirEmpresaAtiva } from '../empresa-ativa';
import type { CriarPiqueteDto, AtualizarPiqueteDto, RegistrarAlturaDto, MoverGadoDto } from './dto';

async function garantirAreaDaEmpresa(empresaId: string, areaId: string) {
  const area = await prisma.area.findFirst({ where: { id: areaId, empresaId } });
  if (!area) throw new NotFoundException('Área não encontrada nesta empresa.');
}

async function garantirPiqueteDaEmpresa(empresaId: string, piqueteId: string) {
  const piquete = await prisma.piquete.findFirst({ where: { id: piqueteId, area: { empresaId } } });
  if (!piquete) throw new NotFoundException('Piquete não encontrado nesta empresa.');
  return piquete;
}

export async function listarPorArea(empresaId: string, areaId: string) {
  empresaId = garantirEmpresaAtiva(empresaId);
  await garantirAreaDaEmpresa(empresaId, areaId);
  const [piquetes, empresa] = await Promise.all([
    prisma.piquete.findMany({
      where: { areaId },
      include: {
        registrosAltura: { orderBy: { data: 'desc' }, take: 1 },
        ocupacoes: { where: { dataFim: null } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { alturaIdealPastoPadrao: true, alturaIdealPastoAtiva: true },
    }),
  ]);
  // Fazenda que desligou a altura ideal continua registrando as medições, só
  // não recebe mais o julgamento de "pronto pra receber o gado".
  const usaAlturaIdeal = empresa?.alturaIdealPastoAtiva ?? true;
  const alturaIdealPastoPadrao = empresa?.alturaIdealPastoPadrao ?? 60;
  return piquetes.map(({ registrosAltura, ocupacoes, ...piquete }) => ({
    ...piquete,
    ultimaAltura: registrosAltura[0] ?? null,
    ocupadoAtualmente: ocupacoes.length > 0,
    alturaIdealEfetiva: usaAlturaIdeal ? piquete.alturaIdealCm ?? alturaIdealPastoPadrao : null,
  }));
}

export async function criar(empresaId: string, dto: CriarPiqueteDto) {
  await garantirAreaDaEmpresa(empresaId, dto.areaId);
  return prisma.piquete.create({
    data: { areaId: dto.areaId, nome: dto.nome, areaHectares: dto.areaHectares, alturaIdealCm: dto.alturaIdealCm },
  });
}

export async function atualizar(empresaId: string, id: string, dto: AtualizarPiqueteDto) {
  await garantirPiqueteDaEmpresa(empresaId, id);
  return prisma.piquete.update({ where: { id }, data: dto });
}

export async function remover(empresaId: string, id: string) {
  await garantirPiqueteDaEmpresa(empresaId, id);
  await prisma.piquete.delete({ where: { id } });
  return { ok: true };
}

export async function registrarAltura(empresaId: string, piqueteId: string, dto: RegistrarAlturaDto) {
  await garantirPiqueteDaEmpresa(empresaId, piqueteId);
  return prisma.registroAlturaPasto.create({
    data: { piqueteId, data: new Date(dto.data), alturaCm: dto.alturaCm },
  });
}

export async function listarAlturas(empresaId: string, piqueteId: string) {
  await garantirPiqueteDaEmpresa(empresaId, piqueteId);
  return prisma.registroAlturaPasto.findMany({ where: { piqueteId }, orderBy: { data: 'desc' } });
}

/** Fecha a ocupação aberta de qualquer piquete da área e abre uma nova neste — só um piquete concentra o gado por vez. */
export async function moverGado(empresaId: string, piqueteId: string, dto: MoverGadoDto) {
  const piqueteDestino = await garantirPiqueteDaEmpresa(empresaId, piqueteId);
  const dataMovimento = new Date(dto.data);
  return prisma.$transaction(async (tx) => {
    const ocupacaoAberta = await tx.ocupacaoPiquete.findFirst({
      where: { piquete: { areaId: piqueteDestino.areaId }, dataFim: null },
    });
    if (ocupacaoAberta) {
      if (ocupacaoAberta.piqueteId === piqueteId) {
        throw new BadRequestException('O gado já está neste piquete.');
      }
      await tx.ocupacaoPiquete.update({ where: { id: ocupacaoAberta.id }, data: { dataFim: dataMovimento } });
    }
    return tx.ocupacaoPiquete.create({ data: { piqueteId, dataInicio: dataMovimento } });
  });
}
