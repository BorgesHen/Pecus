import { api } from './api';
import type { Animal, EventoReprodutivo, SexoAnimal, TipoEventoReprodutivo } from '@pecus/shared';
import type { AnimalComLote } from './animais';

export interface MatrizComStatus extends AnimalComLote {
  statusReprodutivo: string | null;
  ultimoEvento: { tipo: TipoEventoReprodutivo; data: string } | null;
}

export interface EventoReprodutivoComCria extends EventoReprodutivo {
  cria?: Animal | null;
}

export interface NovoEventoReprodutivo {
  animalId: string;
  tipo: TipoEventoReprodutivo;
  data: string;
  resultado?: string;
  observacao?: string;
  criaId?: string;
  criaIdentificador?: string;
  criaSexo?: SexoAnimal;
  criaLoteId?: string;
}

export function listarMatrizes() {
  return api<MatrizComStatus[]>('/reproducao/matrizes');
}

export function listarEventosReprodutivosPorAnimal(animalId: string) {
  return api<EventoReprodutivoComCria[]>(`/reproducao/animal/${animalId}`);
}

export function criarEventoReprodutivo(dados: NovoEventoReprodutivo) {
  return api<EventoReprodutivo>('/reproducao', { method: 'POST', body: dados });
}
