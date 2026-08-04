import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../prisma';
import { PLANO_CONTAS_PADRAO } from './plano-contas-padrao';
import type { CriarGrupoFinanceiroDto, AtualizarGrupoFinanceiroDto } from './dto/grupo-financeiro.dto';
import type { CriarContaFinanceiraDto, AtualizarContaFinanceiraDto } from './dto/conta-financeira.dto';

/** Aceita tanto o client normal quanto o `tx` de dentro de uma transação. */
type ClientePrisma = PrismaClient | Prisma.TransactionClient;

/**
 * Cria o plano de contas padrão da fazenda em 3 idas ao banco (grupos em lote,
 * releitura dos ids, contas em lote) em vez de uma por grupo.
 *
 * O motivo é latência: no cadastro isso roda dentro da transação que cria a
 * fazenda, e um create por grupo dava ~10 round-trips — perto o bastante do
 * timeout de transação do Prisma (5s) pra estourar em produção, onde a
 * latência até o banco é maior que em desenvolvimento.
 */
export async function criarPlanoContasPadrao(cliente: ClientePrisma, empresaId: string) {
  await cliente.grupoFinanceiro.createMany({
    data: PLANO_CONTAS_PADRAO.map((grupo) => ({
      empresaId,
      natureza: grupo.natureza,
      codigo: grupo.codigo,
      nome: grupo.nome,
      ordem: grupo.ordem,
    })),
  });

  // createMany não devolve os registros criados, e as contas precisam do grupoId.
  const gruposCriados = await cliente.grupoFinanceiro.findMany({
    where: { empresaId },
    select: { id: true, codigo: true },
  });
  const idPorCodigo = new Map(gruposCriados.map((g) => [g.codigo, g.id]));

  await cliente.contaFinanceira.createMany({
    data: PLANO_CONTAS_PADRAO.flatMap((grupo) => {
      const grupoId = idPorCodigo.get(grupo.codigo);
      if (!grupoId) return [];
      return grupo.contas.map((conta) => ({ grupoId, codigo: conta.codigo, nome: conta.nome }));
    }),
  });
}

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
  const grupo = await garantirGrupoDaEmpresa(empresaId, id);
  const contas = await prisma.contaFinanceira.count({ where: { grupoId: id } });
  if (contas > 0) throw new BadRequestException('Remova ou mova as contas deste grupo antes de excluí-lo.');
  await prisma.grupoFinanceiro.delete({ where: { id } });
  // Código e nome voltam pra trilha de atividades registrar o que foi excluído.
  return { ok: true, codigo: grupo.codigo, nome: grupo.nome };
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
  const conta = await garantirContaDaEmpresa(empresaId, id);
  const lancamentos = await prisma.lancamento.count({ where: { contaId: id } });
  if (lancamentos > 0) throw new BadRequestException('Esta conta já tem lançamentos vinculados — desative-a em vez de excluir.');
  await prisma.contaFinanceira.delete({ where: { id } });
  return { ok: true, codigo: conta.codigo, nome: conta.nome };
}
