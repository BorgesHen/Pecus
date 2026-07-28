import { api } from './api';
import type { Animal, Lote, StatusAnimal } from '@pecus/shared';

export interface AnimalComLote extends Animal {
  lote?: Lote | null;
}

export interface NovoAnimal {
  loteId: string;
  identificador: string;
  sexo: Animal['sexo'];
  categoria: Animal['categoria'];
  dataEntrada: string;
  dataNascimento?: string;
  pesoEntrada?: number;
  observacao?: string;
}

export function listarAnimais(filtros?: { loteId?: string; status?: StatusAnimal }) {
  const params = new URLSearchParams();
  if (filtros?.loteId) params.set('loteId', filtros.loteId);
  if (filtros?.status) params.set('status', filtros.status);
  const q = params.toString() ? `?${params.toString()}` : '';
  return api<AnimalComLote[]>(`/animais${q}`);
}

export function obterAnimal(id: string) {
  return api<AnimalComLote>(`/animais/${id}`);
}

export function criarAnimal(dados: NovoAnimal) {
  return api<Animal>('/animais', { method: 'POST', body: dados });
}

export function atualizarAnimal(id: string, dados: Partial<NovoAnimal>) {
  return api<Animal>(`/animais/${id}`, { method: 'PATCH', body: dados });
}

export function darSaidaAnimal(
  id: string,
  dados: { status: StatusAnimal; dataSaida: string; motivoSaida?: string },
) {
  return api<Animal>(`/animais/${id}/dar-saida`, { method: 'POST', body: dados });
}
