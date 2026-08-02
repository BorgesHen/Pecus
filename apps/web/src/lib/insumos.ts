import { api } from './api';
import type { Insumo, MovimentoInsumo } from '@pecus/shared';

export interface InsumoComSaldo extends Insumo {
  saldoAtual: number;
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

export interface MovimentoManual {
  quantidade: number;
  data: string;
  observacao?: string;
}

export function registrarConsumo(id: string, dados: MovimentoManual) {
  return api<MovimentoInsumo>(`/insumos/${id}/consumir`, { method: 'POST', body: dados });
}

/** Entrada lançada à mão (saldo inicial, ajuste, produção própria) — sem gasto vinculado. */
export function registrarEntrada(id: string, dados: MovimentoManual) {
  return api<MovimentoInsumo>(`/insumos/${id}/entrada`, { method: 'POST', body: dados });
}
