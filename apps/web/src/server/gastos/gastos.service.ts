import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  CONTA_DA_CATEGORIA_GASTO,
  CategoriaGasto,
  GRUPO_OUTRAS_DESPESAS,
  NaturezaFinanceira,
  TipoMovimentoInsumo,
} from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { listarDespesas, totalPorConta } from '../financeiro/despesas.service';
import { converterParaUnidadeDoInsumo, saldoDe } from '../insumos/custo-insumo.service';
import { prisma } from '../prisma';
import type { CriarGastoDto } from './dto';

/**
 * Gastos: a entrada rápida de despesa já paga.
 *
 * Depois da unificação não existe mais tabela `Gasto` — esta tela grava um
 * `Lancamento`. O que ela preserva é a **facilidade**: o produtor escolhe uma
 * categoria simples ("Ração"), digita valor e data, e pronto. O plano de contas
 * fica atrás da cortina: a categoria é traduzida para conta (ver
 * CONTA_DA_CATEGORIA_GASTO) e o lançamento nasce com vencimento e liquidação na
 * própria data, porque é isso que um gasto é: dinheiro que já saiu.
 *
 * A divisão de trabalho entre as duas telas ficou assim:
 *
 *   Gastos     → despesa já paga, lançamento em um passo
 *   Financeiro → conta a pagar/receber, com parcela, vencimento e banco
 *
 * Antes as duas gravavam em tabelas diferentes e nenhuma via a outra; agora são
 * dois formulários para a mesma tabela.
 */

/** Categorias que existem no enum — o resto é texto livre digitado em "Outros". */
const CATEGORIAS_PADRAO: string[] = Object.values(CategoriaGasto);

/**
 * Acha (ou cria) a conta do plano correspondente à categoria escolhida.
 *
 * Categoria padrão tem código fixo. Categoria digitada à mão ganha conta própria
 * dentro de "Outras Despesas", com o mesmo nome — assim o texto que o produtor
 * escreveu não se perde virando "Diversos", e no mês seguinte ele reencontra a
 * mesma conta em vez de criar outra.
 */
async function contaDaCategoria(
  tx: Prisma.TransactionClient,
  empresaId: string,
  categoria: string,
): Promise<string> {
  const codigo = CATEGORIAS_PADRAO.includes(categoria)
    ? CONTA_DA_CATEGORIA_GASTO[categoria as CategoriaGasto]
    : null;

  if (codigo) {
    const conta = await tx.contaFinanceira.findFirst({
      where: { codigo, grupo: { empresaId } },
      select: { id: true },
    });
    if (conta) return conta.id;
  }

  // Categoria livre (ou plano incompleto): conta com o nome dela em "Outras Despesas".
  const peloNome = await tx.contaFinanceira.findFirst({
    where: { nome: categoria, grupo: { empresaId } },
    select: { id: true },
  });
  if (peloNome) return peloNome.id;

  const grupo = await tx.grupoFinanceiro.findFirst({
    where: { empresaId, codigo: GRUPO_OUTRAS_DESPESAS },
    select: { id: true },
  });
  if (!grupo) {
    // Fazenda sem o grupo "Outras Despesas" no plano — cria pra não recusar o
    // lançamento por causa de estrutura contábil faltando.
    const novo = await tx.grupoFinanceiro.create({
      data: {
        empresaId,
        natureza: NaturezaFinanceira.DESPESA,
        codigo: GRUPO_OUTRAS_DESPESAS,
        nome: 'Outras Despesas',
        ordem: 8,
      },
      select: { id: true },
    });
    const conta = await tx.contaFinanceira.create({
      data: { grupoId: novo.id, codigo: `${GRUPO_OUTRAS_DESPESAS}.90`, nome: categoria },
      select: { id: true },
    });
    return conta.id;
  }

  // Códigos livres a partir de .90 pra não colidir com os do plano padrão.
  const usados = await tx.contaFinanceira.count({ where: { grupoId: grupo.id } });
  const conta = await tx.contaFinanceira.create({
    data: { grupoId: grupo.id, codigo: `${GRUPO_OUTRAS_DESPESAS}.${90 + usados}`, nome: categoria },
    select: { id: true },
  });
  return conta.id;
}

/**
 * Lista as despesas no formato que a tela de Gastos sempre consumiu (categoria,
 * valor, data), lendo de `Lancamento`. Assim a unificação não obrigou a tela a
 * mudar de vocabulário.
 */
export async function listar(empresaId: string, loteId?: string) {
  const despesas = await listarDespesas(empresaId, { loteId });
  return despesas.map((d) => ({
    id: d.id,
    empresaId,
    loteId: d.loteId,
    insumoId: d.insumoId,
    categoria: d.conta,
    descricao: d.descricao,
    valor: d.valor,
    quantidade: d.quantidade,
    unidade: d.unidade,
    data: d.data,
    /** Vem preenchido quando a despesa foi lançada pelo Financeiro e ainda não foi paga. */
    dataLiquidacao: d.dataLiquidacao,
  }));
}

export async function criar(empresaId: string, dtoOriginal: CriarGastoDto) {
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'gastos', camposDesativados);
  const data = new Date(dto.data);

  return prisma.$transaction(async (tx) => {
    const contaId = await contaDaCategoria(tx, empresaId, dto.categoria);

    const lancamento = await tx.lancamento.create({
      data: {
        empresaId,
        contaId,
        loteId: dto.loteId,
        insumoId: dto.insumoId,
        quantidade: dto.quantidade,
        unidade: dto.unidade,
        descricao: dto.descricao,
        valorTotal: dto.valor,
        totalParcelas: 1,
        numeroParcela: 1,
        valorParcela: dto.valor,
        // Gasto é dinheiro que já saiu: nasce vencido e liquidado no mesmo dia.
        // É o que faz ele aparecer no fluxo de caixa e no resultado sem exigir
        // um segundo passo de "liquidar".
        dataDocumento: data,
        dataVencimento: data,
        dataLiquidacao: data,
      },
    });

    // Lançamento com insumo + quantidade = compra que abastece o estoque.
    if (dto.insumoId && dto.quantidade) {
      const insumo = await tx.insumo.findFirst({
        where: { id: dto.insumoId, empresaId },
        select: { unidade: true },
      });
      if (!insumo) throw new NotFoundException('Insumo não encontrado nesta fazenda.');

      // A unidade do lançamento é texto livre e pode não ser a do cadastro do
      // insumo. Converte quando dá; se não der, recusa em vez de somar número com
      // significado errado no saldo.
      const quantidade = converterParaUnidadeDoInsumo(dto.quantidade, dto.unidade, insumo.unidade);

      await tx.movimentoInsumo.create({
        data: {
          empresaId,
          insumoId: dto.insumoId,
          tipo: TipoMovimentoInsumo.ENTRADA,
          quantidade,
          // O valor pago alimenta o custo médio do insumo. A exclusão do
          // lançamento desfaz o movimento junto (ver `remover`), que era por onde
          // os dois divergiam quando isto era uma tabela separada.
          valorTotal: dto.valor,
          data,
          lancamentoId: lancamento.id,
        },
      });
    }

    return lancamento;
  });
}

/**
 * Apaga a despesa e **desfaz a entrada de estoque que ela criou**.
 *
 * O saldo pode ficar negativo se o insumo já foi consumido — e isso é verdade,
 * não erro: aquele estoque nunca existiu. Devolve o efeito pra a tela avisar.
 */
export async function remover(empresaId: string, id: string) {
  // Tolerante a id inexistente: quem clica duas vezes não recebe erro.
  const despesa = await prisma.lancamento.findFirst({
    where: { id, empresaId },
    include: {
      conta: { select: { nome: true } },
      insumo: { select: { id: true, nome: true, unidade: true } },
    },
  });
  if (!despesa) return { ok: true, gasto: null, estoque: null };

  const efeitoNoEstoque = await prisma.$transaction(async (tx) => {
    const movimentos = await tx.movimentoInsumo.findMany({
      where: { lancamentoId: id },
      select: { id: true, quantidade: true },
    });

    // Baixa de aplicação sanitária jamais tem lancamentoId, então não há risco de
    // arrastar o consumo de um animal junto com a compra.
    if (movimentos.length > 0) await tx.movimentoInsumo.deleteMany({ where: { lancamentoId: id } });
    await tx.lancamento.deleteMany({ where: { id, empresaId } });

    if (movimentos.length === 0 || !despesa.insumo) return null;

    const saldos = await saldoDe([despesa.insumo.id], tx);
    const saldoDepois = saldos.get(despesa.insumo.id) ?? 0;
    return {
      insumo: despesa.insumo.nome,
      unidade: despesa.insumo.unidade,
      quantidadeDesfeita: movimentos.reduce((soma, m) => soma + m.quantidade, 0),
      saldoDepois,
      aviso:
        saldoDepois < 0
          ? `O estoque de "${despesa.insumo.nome}" ficou negativo (${saldoDepois.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} ${despesa.insumo.unidade}): parte dessa compra já havia sido consumida.`
          : null,
    };
  });

  return {
    ok: true,
    gasto: { categoria: despesa.conta.nome, valor: Number(despesa.valorParcela) },
    estoque: efeitoNoEstoque,
  };
}

/**
 * Contas de despesa que a fazenda já usou fora do plano padrão.
 *
 * Antes eram as categorias digitadas à mão em `Gasto.categoria`; agora são contas
 * de verdade, e o seletor da tela continua oferecendo o que já foi usado.
 */
export async function categoriasCustomizadas(empresaId: string) {
  const contas = await prisma.contaFinanceira.findMany({
    where: {
      grupo: { empresaId, natureza: NaturezaFinanceira.DESPESA },
      NOT: { nome: { in: CATEGORIAS_PADRAO } },
      lancamentos: { some: {} },
    },
    select: { nome: true },
    orderBy: { nome: 'asc' },
  });
  return contas.map((c) => c.nome);
}

/** Total de despesa por conta (o "gasto por categoria" do dashboard). */
export function totalPorCategoria(empresaId: string, loteId?: string) {
  return totalPorConta(empresaId, loteId);
}
