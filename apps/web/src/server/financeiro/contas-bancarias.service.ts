import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma';
import type { CriarContaBancariaDto, AtualizarContaBancariaDto } from './dto/conta-bancaria.dto';

async function garantirContaBancariaDaEmpresa(empresaId: string, id: string) {
  const conta = await prisma.contaBancaria.findFirst({ where: { id, empresaId } });
  if (!conta) throw new NotFoundException('Conta bancária não encontrada nesta empresa.');
  return conta;
}

export function listar(empresaId: string) {
  return prisma.contaBancaria.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
}

export function criar(empresaId: string, dto: CriarContaBancariaDto) {
  return prisma.contaBancaria.create({
    data: {
      empresaId,
      nome: dto.nome,
      saldoInicial: dto.saldoInicial ?? 0,
      dataSaldoInicial: dto.dataSaldoInicial ? new Date(dto.dataSaldoInicial) : undefined,
    },
  });
}

export async function atualizar(empresaId: string, id: string, dto: AtualizarContaBancariaDto) {
  await garantirContaBancariaDaEmpresa(empresaId, id);
  return prisma.contaBancaria.update({
    where: { id },
    data: { ...dto, dataSaldoInicial: dto.dataSaldoInicial ? new Date(dto.dataSaldoInicial) : undefined },
  });
}

export async function remover(empresaId: string, id: string) {
  await garantirContaBancariaDaEmpresa(empresaId, id);
  const lancamentos = await prisma.lancamento.count({ where: { contaBancariaId: id } });
  if (lancamentos > 0) throw new BadRequestException('Este banco já tem lançamentos vinculados — desative-o em vez de excluir.');
  await prisma.contaBancaria.delete({ where: { id } });
  return { ok: true };
}
