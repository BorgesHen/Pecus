import { BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma';
import type { CriarGrupoFinanceiroDto, AtualizarGrupoFinanceiroDto } from './dto/grupo-financeiro.dto';
import type { CriarContaFinanceiraDto, AtualizarContaFinanceiraDto } from './dto/conta-financeira.dto';

async function garantirGrupoDaEmpresa(empresaId: string, grupoId: string) {
  const grupo = await prisma.grupoFinanceiro.findFirst({ where: { id: grupoId, empresaId } });
  if (!grupo) throw new NotFoundException('Grupo financeiro não encontrado nesta empresa.');
  return grupo;
}

async function garantirContaDaEmpresa(empresaId: string, contaId: string) {
  const conta = await prisma.contaFinanceira.findFirst({ where: { id: contaId, grupo: { empresaId } } });
  if (!conta) throw new NotFoundException('Conta financeira não encontrada nesta empresa.');
  return conta;
}

export function listar(empresaId: string) {
  return prisma.grupoFinanceiro.findMany({
    where: { empresaId },
    include: { contas: { orderBy: { codigo: 'asc' } } },
    orderBy: { ordem: 'asc' },
  });
}

export function criarGrupo(empresaId: string, dto: CriarGrupoFinanceiroDto) {
  return prisma.grupoFinanceiro.create({
    data: { empresaId, natureza: dto.natureza, codigo: dto.codigo, nome: dto.nome, ordem: dto.ordem ?? 0 },
  });
}

export async function atualizarGrupo(empresaId: string, id: string, dto: AtualizarGrupoFinanceiroDto) {
  await garantirGrupoDaEmpresa(empresaId, id);
  return prisma.grupoFinanceiro.update({ where: { id }, data: dto });
}

export async function removerGrupo(empresaId: string, id: string) {
  await garantirGrupoDaEmpresa(empresaId, id);
  const contas = await prisma.contaFinanceira.count({ where: { grupoId: id } });
  if (contas > 0) throw new BadRequestException('Remova ou mova as contas deste grupo antes de excluí-lo.');
  await prisma.grupoFinanceiro.delete({ where: { id } });
  return { ok: true };
}

export async function criarConta(empresaId: string, dto: CriarContaFinanceiraDto) {
  await garantirGrupoDaEmpresa(empresaId, dto.grupoId);
  return prisma.contaFinanceira.create({ data: { grupoId: dto.grupoId, codigo: dto.codigo, nome: dto.nome } });
}

export async function atualizarConta(empresaId: string, id: string, dto: AtualizarContaFinanceiraDto) {
  await garantirContaDaEmpresa(empresaId, id);
  return prisma.contaFinanceira.update({ where: { id }, data: dto });
}

export async function removerConta(empresaId: string, id: string) {
  await garantirContaDaEmpresa(empresaId, id);
  const lancamentos = await prisma.lancamento.count({ where: { contaId: id } });
  if (lancamentos > 0) throw new BadRequestException('Esta conta já tem lançamentos vinculados — desative-a em vez de excluir.');
  await prisma.contaFinanceira.delete({ where: { id } });
  return { ok: true };
}
