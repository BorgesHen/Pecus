import { api } from './api';
import type { Animal, EventoSanitario, TipoEventoSanitario } from '@pecus/shared';

export interface EventoSanitarioComAnimal extends EventoSanitario {
  animal: Animal;
}

/**
 * Evento com o insumo aplicado. A unidade vem do CADASTRO do insumo, que é a
 * unidade em que `quantidadeInsumo` está gravada — `unidadeInsumo` guarda o que
 * foi digitado, não a base. Sem isso a tela converteria 0,005 L como se fosse
 * 0,005 ml.
 */
export interface EventoSanitarioComInsumo extends EventoSanitario {
  insumo?: { id: string; nome: string; unidade: string } | null;
}

/** Insumo consumido numa aplicação. Informar os três liga o manejo ao estoque e ao custo. */
export interface InsumoAplicado {
  insumoId?: string;
  /** No lançamento individual é a quantidade; na aplicação em massa é a dose POR ANIMAL. */
  quantidadeInsumo?: number;
  unidadeInsumo?: string;
}

export interface NovoEventoSanitario extends InsumoAplicado {
  animalId: string;
  tipo: TipoEventoSanitario;
  nome: string;
  data: string;
  proximaAplicacao?: string;
  escoreFamacha?: number;
  escoreCorporal?: number;
  observacao?: string;
}

export interface AplicarEmMassa extends InsumoAplicado {
  loteId?: string;
  animalIds?: string[];
  tipo: TipoEventoSanitario;
  nome: string;
  data: string;
  proximaAplicacao?: string;
  observacao?: string;
}

/** O que a API devolve depois de aplicar: o evento mais o efeito no estoque. */
export interface EventoSanitarioRegistrado extends EventoSanitario {
  animalIdentificador: string;
  insumoNome: string | null;
  insumoUnidade: string | null;
  custoUnitario: number | null;
  saldoDepois: number | null;
  aviso: string | null;
}

export interface AplicacaoEmMassaRegistrada {
  ok: true;
  animaisAfetados: number;
  insumo: {
    nome: string;
    unidade: string;
    dosePorAnimal: number;
    quantidadeTotal: number;
    custoUnitario: number | null;
    custoPorAnimal: number | null;
    custoTotal: number | null;
    saldoDepois: number;
  } | null;
  aviso: string | null;
}

export function listarEventosPorAnimal(animalId: string) {
  return api<EventoSanitarioComInsumo[]>(`/sanidade/animal/${animalId}`);
}

export function criarEventoSanitario(dados: NovoEventoSanitario) {
  return api<EventoSanitarioRegistrado>('/sanidade', { method: 'POST', body: dados });
}

export function aplicarEmMassa(dados: AplicarEmMassa) {
  return api<AplicacaoEmMassaRegistrada>('/sanidade/aplicar-em-massa', {
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
