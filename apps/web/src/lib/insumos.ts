import { api } from './api';
import type { Insumo, MovimentoInsumo } from '@pecus/shared';

export interface InsumoComSaldo extends Insumo {
  saldoAtual: number;
  /** R$ por unidade de cadastro, pela média das compras. Nulo = nenhuma entrada com valor. */
  custoUnitario: number | null;
  /** saldoAtual × custoUnitario. Nulo quando não há custo — zero diria "não vale nada". */
  valorEmEstoque: number | null;
  /** Unidades aceitas ao lançar consumo (L aceita ml, kg aceita g). */
  unidadesAceitas: string[];
}

export interface NovoInsumo {
  nome: string;
  unidade: string;
  estoqueMinimo?: number;
}

export function listarInsumos() {
  return api<InsumoComSaldo[]>('/insumos');
}

export function obterInsumo(id: string) {
  return api<InsumoComSaldo>(`/insumos/${id}`);
}

export function criarInsumo(dados: NovoInsumo) {
  return api<Insumo>('/insumos', { method: 'POST', body: dados });
}

export function atualizarInsumo(id: string, dados: Partial<NovoInsumo>) {
  return api<Insumo>(`/insumos/${id}`, { method: 'PATCH', body: dados });
}

export function listarMovimentosInsumo(id: string) {
  return api<MovimentoInsumo[]>(`/insumos/${id}/movimentos`);
}

/**
 * Apaga um movimento lançado à mão. Recusado (409) para o que veio de uma compra
 * ou de uma aplicação sanitária — nesses casos o dono do registro é o gasto ou o
 * evento sanitário.
 */
export function removerMovimentoInsumo(insumoId: string, movimentoId: string) {
  return api<{ ok: true; tipo: string; quantidade: number; valorTotal: number | null }>(
    `/insumos/${insumoId}/movimentos/${movimentoId}`,
    { method: 'DELETE' },
  );
}

export interface MovimentoManual {
  quantidade: number;
  /** Unidade da quantidade; ausente = unidade de cadastro do insumo. */
  unidade?: string;
  data: string;
  observacao?: string;
  /** Só na entrada: quanto se pagou. É o que alimenta o custo médio do insumo. */
  valorTotal?: number;
  /**
   * Só no consumo: lote que gastou. É o que faz a ração comprada pelo estoque
   * entrar no custo do lote — sem lote, a baixa é consumo geral da fazenda e não
   * entra em custo nenhum.
   */
  loteId?: string;
}

/** Baixa de estoque com o custo do que saiu, e aviso quando o saldo fica negativo. */
export interface ConsumoRegistrado {
  id: string;
  quantidade: number;
  valorTotal: number | null;
  custoUnitario: number | null;
  saldoDepois: number;
  aviso: string | null;
  insumo: { nome: string; unidade: string };
}

export function registrarConsumo(id: string, dados: MovimentoManual) {
  return api<ConsumoRegistrado>(`/insumos/${id}/consumir`, { method: 'POST', body: dados });
}

/** Entrada lançada à mão (saldo inicial, ajuste, produção própria) — sem gasto vinculado. */
export function registrarEntrada(id: string, dados: MovimentoManual) {
  return api<MovimentoInsumo>(`/insumos/${id}/entrada`, { method: 'POST', body: dados });
}
