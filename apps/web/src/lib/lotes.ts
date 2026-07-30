import { api } from './api';
import type {
  Lote,
  Area,
  Gasto,
  Pesagem,
  MetodoManejo,
  LoteMetodoHistorico,
  TipoMetodoManejo,
  EspecieAnimal,
} from '@pecus/shared';

export interface LoteComContagem extends Lote {
  metodoManejo?: MetodoManejo | null;
  _count: { pesagens: number; gastos: number };
}

export interface LoteDetalhado extends Lote {
  metodoManejo?: MetodoManejo | null;
  area?: Area | null;
  pesagens: Pesagem[];
  gastos: Gasto[];
  metodoHistorico: LoteMetodoHistorico[];
}

export interface NovoLote {
  identificacao: string;
  especie?: EspecieAnimal;
  dataAquisicao: string;
  quantidadeAnimais: number;
  pesoMedioEntrada?: number;
  metodoManejoId?: string;
  areaId?: string;
  rendimentoCarcaca?: number;
  gmdEsperado?: number;
}

export interface ParametrosLote {
  areaId?: string;
  rendimentoCarcaca?: number;
  gmdEsperado?: number;
}

export function listarLotes() {
  return api<LoteComContagem[]>('/lotes');
}

export function obterLote(id: string) {
  return api<LoteDetalhado>(`/lotes/${id}`);
}

export function criarLote(dados: NovoLote) {
  return api<LoteComContagem>('/lotes', { method: 'POST', body: dados });
}

export function atualizarLote(id: string, dados: ParametrosLote) {
  return api<LoteComContagem>(`/lotes/${id}`, { method: 'PATCH', body: dados });
}

export function trocarMetodoLote(id: string, dados: { metodoManejoId: string; dataTroca: string }) {
  return api<LoteComContagem>(`/lotes/${id}/trocar-metodo`, { method: 'POST', body: dados });
}

export function removerLote(id: string) {
  return api<{ ok: true }>(`/lotes/${id}`, { method: 'DELETE' });
}

export function listarMetodosManejo() {
  return api<MetodoManejo[]>('/metodos-manejo');
}

export function criarMetodoManejo(nome: string, tipo: TipoMetodoManejo) {
  return api<MetodoManejo>('/metodos-manejo', { method: 'POST', body: { nome, tipo } });
}

export function removerMetodoManejo(id: string) {
  return api<{ ok: true }>(`/metodos-manejo/${id}`, { method: 'DELETE' });
}
