import { api } from './api';
import type { Pesagem } from '@pecus/shared';

export interface NovaPesagem {
  loteId: string;
  data: string;
  pesoMedio: number;
}

export interface Gmd {
  gmd: number | null;
  pesoInicial?: number;
  pesoAtual?: number;
  dias?: number;
  mensagem?: string;
}

export function listarPesagens(loteId: string) {
  return api<Pesagem[]>(`/pesagens?loteId=${loteId}`);
}

export function criarPesagem(dados: NovaPesagem) {
  return api<Pesagem>('/pesagens', { method: 'POST', body: dados });
}

export function obterGmd(loteId: string) {
  return api<Gmd>(`/pesagens/gmd/${loteId}`);
}
