import { api } from './api';

export interface Convite {
  id: string;
  codigo: string;
  observacao: string | null;
  usadoEm: string | null;
  createdAt: string;
}

export function listarConvites() {
  return api<Convite[]>('/convites');
}

export function criarConvite(observacao?: string) {
  return api<Convite>('/convites', { method: 'POST', body: { observacao } });
}

export function removerConvite(id: string) {
  return api<void>(`/convites/${id}`, { method: 'DELETE' });
}
