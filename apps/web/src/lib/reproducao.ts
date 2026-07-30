import { api } from './api';
import type {
  Animal,
  EventoReprodutivo,
  SexoAnimal,
  TipoEventoReprodutivo,
  EspecieAnimal,
} from '@pecus/shared';
import type { AnimalComLote } from './animais';

export interface MatrizComStatus extends AnimalComLote {
  statusReprodutivo: string | null;
  ultimoEvento: { tipo: TipoEventoReprodutivo; data: string } | null;
}

export interface EventoReprodutivoComCria extends EventoReprodutivo {
  cria?: Animal | null;
}

/** Uma cria a cadastrar junto do parto. Parto múltiplo é comum em ovinos. */
export interface NovaCria {
  identificador: string;
  sexo?: SexoAnimal;
}

export interface NovoEventoReprodutivo {
  animalId: string;
  tipo: TipoEventoReprodutivo;
  data: string;
  resultado?: string;
  observacao?: string;
  criaId?: string;
  crias?: NovaCria[];
  numeroCrias?: number;
  criaLoteId?: string;
}

export interface IndicadoresReproducao {
  especie: EspecieAnimal;
  matrizesAtivas: number;
  totalPartos: number;
  criasNascidas: number;
  prolificidade: number | null;
  totalDesmames: number;
  taxaDesmame: number | null;
  totalDiagnosticos: number;
  taxaPrenhez: number | null;
}

export function listarMatrizes(especie?: EspecieAnimal) {
  const q = especie ? `?especie=${especie}` : '';
  return api<MatrizComStatus[]>(`/reproducao/matrizes${q}`);
}

export function listarEventosReprodutivosPorAnimal(animalId: string) {
  return api<EventoReprodutivoComCria[]>(`/reproducao/animal/${animalId}`);
}

export function criarEventoReprodutivo(dados: NovoEventoReprodutivo) {
  return api<EventoReprodutivo>('/reproducao', { method: 'POST', body: dados });
}

export function indicadoresReproducao(especie: EspecieAnimal) {
  return api<IndicadoresReproducao>(`/reproducao/indicadores?especie=${especie}`);
}
