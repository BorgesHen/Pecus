import { api } from './api';
import type { Gasto } from '@pecus/shared';

export interface NovoGasto {
  categoria: string;
  valor: number;
  data: string;
  loteId?: string;
  insumoId?: string;
  descricao?: string;
  quantidade?: number;
  unidade?: string;
}

export interface GastoPorCategoria {
  categoria: string;
  total: number;
}

export function listarGastos(loteId?: string) {
  const q = loteId ? `?loteId=${loteId}` : '';
  return api<Gasto[]>(`/gastos${q}`);
}

export function criarGasto(dados: NovoGasto) {
  return api<Gasto>('/gastos', { method: 'POST', body: dados });
}

/**
 * Exclui o gasto — e desfaz a entrada de estoque que ele tinha gerado.
 *
 * `estoque` vem preenchido só quando havia entrada a desfazer, com o saldo
 * resultante e um aviso quando ele fica negativo (parte da compra já consumida).
 */
export function removerGasto(id: string) {
  return api<{
    ok: true;
    estoque: {
      insumo: string;
      unidade: string;
      quantidadeDesfeita: number;
      saldoDepois: number;
      aviso: string | null;
    } | null;
  }>(`/gastos/${id}`, { method: 'DELETE' });
}

export function gastosPorCategoria(loteId?: string) {
  const q = loteId ? `?loteId=${loteId}` : '';
  return api<GastoPorCategoria[]>(`/gastos/por-categoria${q}`);
}

/** Categorias além das padrão, já cadastradas pela empresa via "Outros". */
export function categoriasCustomizadas() {
  return api<string[]>('/gastos/categorias-customizadas');
}
