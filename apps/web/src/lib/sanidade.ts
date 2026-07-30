import { api } from './api';
import type { Animal, EventoSanitario, TipoEventoSanitario } from '@pecus/shared';

export interface EventoSanitarioComAnimal extends EventoSanitario {
  animal: Animal;
}

export interface NovoEventoSanitario {
  animalId: string;
  tipo: TipoEventoSanitario;
  nome: string;
  data: string;
  proximaAplicacao?: string;
  escoreFamacha?: number;
  escoreCorporal?: number;
  observacao?: string;
}

export interface AplicarEmMassa {
  loteId?: string;
  animalIds?: string[];
  tipo: TipoEventoSanitario;
  nome: string;
  data: string;
  proximaAplicacao?: string;
  observacao?: string;
}

export function listarEventosPorAnimal(animalId: string) {
  return api<EventoSanitario[]>(`/sanidade/animal/${animalId}`);
}

export function criarEventoSanitario(dados: NovoEventoSanitario) {
  return api<EventoSanitario>('/sanidade', { method: 'POST', body: dados });
}

export function aplicarEmMassa(dados: AplicarEmMassa) {
  return api<{ ok: true; animaisAfetados: number }>('/sanidade/aplicar-em-massa', {
    method: 'POST',
    body: dados,
  });
}

export function proximosVencimentos(dias?: number) {
  const q = dias ? `?dias=${dias}` : '';
  return api<{ vencidos: EventoSanitarioComAnimal[]; proximos: EventoSanitarioComAnimal[] }>(
    `/sanidade/proximos-vencimentos${q}`,
  );
}

export function historicoSanitario(limite?: number) {
  const q = limite ? `?limite=${limite}` : '';
  return api<EventoSanitarioComAnimal[]>(`/sanidade/historico${q}`);
}

/** Uma linha do alerta de vermifugação seletiva (FAMACHA) — só ovinos. */
export interface AvaliacaoFamacha {
  animalId: string;
  identificador: string;
  lote?: { id: string; identificacao: string } | null;
  data: string;
  escoreFamacha: number;
  escoreCorporal?: number | null;
  precisaVermifugar: boolean;
  conduta: string;
}

export interface AlertaFamacha {
  semAvaliacao: number;
  totalAvaliados: number;
  paraVermifugar: AvaliacaoFamacha[];
  avaliados: AvaliacaoFamacha[];
}

export function alertaFamacha() {
  return api<AlertaFamacha>('/sanidade/alerta-famacha');
}
