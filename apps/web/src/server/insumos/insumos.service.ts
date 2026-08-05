import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoMovimentoInsumo, unidadesDeUso } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { prisma } from '../prisma';
import * as empresasService from '../empresas/empresas.service';
import {
  baixarEstoque,
  converterParaUnidadeDoInsumo,
  custoMedioDe,
  saldoDe,
} from './custo-insumo.service';
import type {
  CriarInsumoDto,
  AtualizarInsumoDto,
  RegistrarConsumoDto,
  RegistrarEntradaDto,
} from './dto';

/**
 * Saldo, custo médio e valor em estoque de um insumo — o que a tela mostra em
 * cada linha. O valor em estoque usa o custo médio, então um insumo sem compra
 * valorada aparece com valor nulo em vez de zero: zero diria "não vale nada",
 * quando o que se sabe é "não se sabe".
 */
function comSaldoECusto(
  insumo: { id: string; unidade: string },
  saldos: Map<string, number>,
  custos: Map<string, { custoUnitario: number | null }>,
) {
  const saldoAtual = saldos.get(insumo.id) ?? 0;
  const custoUnitario = custos.get(insumo.id)?.custoUnitario ?? null;
  return {
    saldoAtual,
    custoUnitario,
    valorEmEstoque: custoUnitario == null ? null : Math.round(custoUnitario * saldoAtual * 100) / 100,
    /** Unidades aceitas no lançamento de consumo (L aceita ml, kg aceita g). */
    unidadesAceitas: unidadesDeUso(insumo.unidade),
  };
}

export async function listar(empresaId: string) {
  const insumos = await prisma.insumo.findMany({ where: { empresaId }, orderBy: { nome: 'asc' } });
  if (insumos.length === 0) return [];

  // Duas consultas agregadas pro estoque inteiro, em vez de duas por insumo. O
  // N+1 anterior abria 2*N consultas concorrentes e podia esgotar o pool.
  const ids = insumos.map((i) => i.id);
  const [saldos, custos] = await Promise.all([saldoDe(ids), custoMedioDe(ids)]);

  return insumos.map((insumo) => ({ ...insumo, ...comSaldoECusto(insumo, saldos, custos) }));
}

export async function detalhar(empresaId: string, id: string) {
  const insumo = await prisma.insumo.findFirst({ where: { id, empresaId } });
  if (!insumo) throw new NotFoundException('Insumo não encontrado.');
  const [saldos, custos] = await Promise.all([saldoDe([id]), custoMedioDe([id])]);
  return { ...insumo, ...comSaldoECusto(insumo, saldos, custos) };
}

export async function criar(empresaId: string, dtoOriginal: CriarInsumoDto) {
  const existente = await prisma.insumo.findFirst({ where: { empresaId, nome: dtoOriginal.nome } });
  if (existente) throw new ConflictException(['Já existe um insumo com esse nome nesta fazenda.']);

  const camposDesativados = await empresasService.obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'estoque', camposDesativados);

  return prisma.insumo.create({ data: { empresaId, nome: dto.nome, unidade: dto.unidade, estoqueMinimo: dto.estoqueMinimo } });
}

export async function atualizar(empresaId: string, id: string, dtoOriginal: AtualizarInsumoDto) {
  await detalhar(empresaId, id);
  const camposDesativados = await empresasService.obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'estoque', camposDesativados);
  return prisma.insumo.update({ where: { id }, data: dto });
}

export async function listarMovimentos(empresaId: string, insumoId: string) {
  const movimentos = await prisma.movimentoInsumo.findMany({
    where: { empresaId, insumoId },
    orderBy: { data: 'desc' },
  });
  // `valorTotal` é Decimal e serializa como string no JSON; converter aqui é o
  // que mantém honesto o tipo `number | null` declarado no frontend.
  return movimentos.map((m) => ({ ...m, valorTotal: m.valorTotal == null ? null : Number(m.valorTotal) }));
}

/**
 * Consumo manual (baixa). O valor da saída sai do custo médio do insumo — é o
 * que faz o extrato do estoque dizer não só quanto saiu, mas quanto aquilo
 * custou.
 */
export async function registrarConsumo(empresaId: string, insumoId: string, dto: RegistrarConsumoDto) {
  const insumo = await detalhar(empresaId, insumoId);

  // Lote de outra fazenda não pode receber o custo: sem esta checagem, um id
  // qualquer no corpo da requisição jogaria a baixa no lote de outra empresa.
  if (dto.loteId) {
    const lote = await prisma.lote.findFirst({ where: { id: dto.loteId, empresaId }, select: { id: true } });
    if (!lote) throw new NotFoundException('Lote não encontrado nesta fazenda.');
  }

  const baixa = await prisma.$transaction((tx) =>
    baixarEstoque(tx, {
      empresaId,
      insumoId,
      nomeDoInsumo: insumo.nome,
      unidadeDoInsumo: insumo.unidade,
      quantidade: dto.quantidade,
      unidadeInformada: dto.unidade,
      loteId: dto.loteId,
      data: new Date(dto.data),
      observacao: dto.observacao,
    }),
  );
  // Nome e unidade acompanham o movimento pra trilha de atividades escrever
  // "20 kg de Sal mineral" sem uma consulta extra.
  return {
    id: baixa.movimentoId,
    tipo: TipoMovimentoInsumo.SAIDA,
    quantidade: baixa.quantidade,
    valorTotal: baixa.valorTotal,
    custoUnitario: baixa.custoUnitario,
    saldoDepois: baixa.saldoDepois,
    aviso: baixa.aviso ?? null,
    loteId: dto.loteId ?? null,
    insumo: { nome: insumo.nome, unidade: insumo.unidade },
  };
}

/**
 * Apaga um movimento de estoque lançado à mão.
 *
 * Existe porque quantidade e unidade são digitadas: quem lança 1000 achando que
 * são mililitros de um insumo cadastrado em litro coloca mil litros no estoque, e
 * o custo médio fica mil vezes menor. Sem uma forma de apagar, o único conserto
 * era mexer no banco.
 *
 * Só movimento **manual**: o que veio de uma compra tem `gastoId` e some junto
 * com o gasto — apagar só o movimento deixaria o gasto apontando pro nada. E o
 * que veio de uma aplicação sanitária pertence ao evento: apagar aqui deixaria o
 * evento dizendo que consumiu algo que não saiu do estoque.
 */
export async function removerMovimento(empresaId: string, insumoId: string, movimentoId: string) {
  const movimento = await prisma.movimentoInsumo.findFirst({
    where: { id: movimentoId, insumoId, empresaId },
    include: { _count: { select: { eventosSanitarios: true } } },
  });
  if (!movimento) throw new NotFoundException('Movimento não encontrado neste insumo.');

  if (movimento.gastoId) {
    throw new ConflictException([
      'Este movimento veio de uma compra registrada como gasto. Exclua o gasto para desfazer a entrada.',
    ]);
  }
  if (movimento._count.eventosSanitarios > 0) {
    throw new ConflictException([
      'Esta baixa foi gerada por uma aplicação sanitária e pertence ao evento — não pode ser apagada isoladamente.',
    ]);
  }

  await prisma.movimentoInsumo.delete({ where: { id: movimentoId } });
  return {
    ok: true,
    tipo: movimento.tipo,
    quantidade: movimento.quantidade,
    valorTotal: movimento.valorTotal == null ? null : Number(movimento.valorTotal),
  };
}

/**
 * Entrada manual. Fica sem `gastoId` de propósito: é o que separa o que entrou
 * por compra registrada (rastreável até o gasto) do que foi lançado à mão.
 *
 * O valor é opcional e é o que alimenta o custo médio. Entrada sem valor (saldo
 * inicial, ajuste de inventário, doação) fica de fora da média em vez de entrar
 * como zero — zero puxaria o custo do insumo pra baixo e faria o remédio
 * parecer mais barato do que é.
 */
export async function registrarEntrada(empresaId: string, insumoId: string, dto: RegistrarEntradaDto) {
  const insumo = await detalhar(empresaId, insumoId);
  const quantidade = converterParaUnidadeDoInsumo(dto.quantidade, dto.unidade, insumo.unidade);
  const movimento = await prisma.movimentoInsumo.create({
    data: {
      empresaId,
      insumoId,
      tipo: TipoMovimentoInsumo.ENTRADA,
      quantidade,
      valorTotal: dto.valorTotal,
      data: new Date(dto.data),
      observacao: dto.observacao,
    },
  });
  return {
    ...movimento,
    valorTotal: movimento.valorTotal == null ? null : Number(movimento.valorTotal),
    insumo: { nome: insumo.nome, unidade: insumo.unidade },
  };
}
