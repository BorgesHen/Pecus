import { ConflictException, NotFoundException } from '@nestjs/common';
import { StatusAnimal } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import type { CriarAnimalDto, AtualizarAnimalDto, DarSaidaAnimalDto } from './dto';

async function garantirLoteDaEmpresa(empresaId: string, loteId: string) {
  const lote = await prisma.lote.findFirst({ where: { id: loteId, empresaId } });
  if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
}

async function garantirIdentificadorLivre(empresaId: string, identificador: string, ignorarId?: string) {
  const existente = await prisma.animal.findFirst({
    where: { empresaId, identificador, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
  });
  if (existente) throw new ConflictException(['Já existe um animal com esse identificador nesta fazenda.']);
}

export function listar(empresaId: string, filtros: { loteId?: string; status?: StatusAnimal }) {
  return prisma.animal.findMany({
    where: { empresaId, loteId: filtros.loteId, status: filtros.status },
    include: { lote: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function detalhar(empresaId: string, id: string) {
  const animal = await prisma.animal.findFirst({ where: { id, empresaId }, include: { lote: true } });
  if (!animal) throw new NotFoundException('Animal não encontrado.');
  return animal;
}

export async function criar(empresaId: string, dtoOriginal: CriarAnimalDto) {
  await garantirLoteDaEmpresa(empresaId, dtoOriginal.loteId);
  await garantirIdentificadorLivre(empresaId, dtoOriginal.identificador);

  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'animais', camposDesativados);

  return prisma.animal.create({
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

export async function atualizar(empresaId: string, id: string, dto: AtualizarAnimalDto) {
  await detalhar(empresaId, id);
  if (dto.loteId) await garantirLoteDaEmpresa(empresaId, dto.loteId);
  if (dto.identificador) await garantirIdentificadorLivre(empresaId, dto.identificador, id);

  return prisma.animal.update({
    where: { id },
    data: { ...dto, dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined },
  });
}

export async function darSaida(empresaId: string, id: string, dto: DarSaidaAnimalDto) {
  await detalhar(empresaId, id);
  return prisma.animal.update({
    where: { id },
    data: { status: dto.status, dataSaida: new Date(dto.dataSaida), motivoSaida: dto.motivoSaida },
  });
}
