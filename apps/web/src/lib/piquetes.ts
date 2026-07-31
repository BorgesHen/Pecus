import { api } from './api';
import type { Piquete, RegistroAlturaPasto } from '@pecus/shared';

export interface PiqueteComStatus extends Piquete {
  ultimaAltura: RegistroAlturaPasto | null;
  ocupadoAtualmente: boolean;
  /** null = a fazenda desligou a altura ideal do capim nas Configurações. */
  alturaIdealEfetiva: number | null;
}

export interface NovoPiquete {
  areaId: string;
  nome: string;
  areaHectares?: number;
  alturaIdealCm?: number;
}

export interface ParametrosPiquete {
  nome?: string;
  areaHectares?: number;
  alturaIdealCm?: number;
}

export function listarPiquetes(areaId: string) {
  return api<PiqueteComStatus[]>(`/piquetes?areaId=${areaId}`);
}

export function criarPiquete(dados: NovoPiquete) {
  return api<Piquete>('/piquetes', { method: 'POST', body: dados });
}

export function atualizarPiquete(id: string, dados: ParametrosPiquete) {
  return api<Piquete>(`/piquetes/${id}`, { method: 'PATCH', body: dados });
}

export function removerPiquete(id: string) {
  return api<{ ok: true }>(`/piquetes/${id}`, { method: 'DELETE' });
}

export function listarAlturasPasto(piqueteId: string) {
  return api<RegistroAlturaPasto[]>(`/piquetes/${piqueteId}/alturas`);
}

export function registrarAlturaPasto(piqueteId: string, dados: { data: string; alturaCm: number }) {
  return api<RegistroAlturaPasto>(`/piquetes/${piqueteId}/alturas`, { method: 'POST', body: dados });
}

export function moverGadoParaPiquete(piqueteId: string, dados: { data: string }) {
  return api<{ id: string }>(`/piquetes/${piqueteId}/mover-gado`, { method: 'POST', body: dados });
}
