import { api } from './api';
import type { Area, Piquete } from '@pecus/shared';

export interface AreaComContagem extends Area {
  _count: { piquetes: number; lotes: number };
}

export interface AreaDetalhada extends Area {
  piquetes: Piquete[];
  lotes: { id: string; identificacao: string }[];
}

export interface NovaArea {
  nome: string;
  areaHectares?: number;
}

export interface ParametrosArea {
  nome?: string;
  areaHectares?: number;
}

export function listarAreas() {
  return api<AreaComContagem[]>('/areas');
}

export function obterArea(id: string) {
  return api<AreaDetalhada>(`/areas/${id}`);
}

export function criarArea(dados: NovaArea) {
  return api<Area>('/areas', { method: 'POST', body: dados });
}

export function atualizarArea(id: string, dados: ParametrosArea) {
  return api<Area>(`/areas/${id}`, { method: 'PATCH', body: dados });
}

export function removerArea(id: string) {
  return api<{ ok: true }>(`/areas/${id}`, { method: 'DELETE' });
}
