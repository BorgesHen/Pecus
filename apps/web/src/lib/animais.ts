import { api } from './api';
import type { Animal, CustoAnimal, Lote, ResultadoGmdAnimal, StatusAnimal } from '@pecus/shared';

export type { CustoAnimal };

export interface AnimalComLote extends Animal {
  lote?: Lote | null;
  /** Vem calculado na listagem; nulo quando o animal não tem pesos suficientes. */
  gmd?: ResultadoGmdAnimal | null;
}

export interface PesagemDoAnimal {
  id: string;
  data: string;
  peso: number;
  observacao?: string | null;
}

export interface HistoricoPesoAnimal {
  pesagens: PesagemDoAnimal[];
  gmd: ResultadoGmdAnimal;
}

export interface NovaPesagemAnimal {
  data: string;
  peso: number;
  observacao?: string;
}

export interface NovoAnimal {
  loteId: string;
  identificador: string;
  sexo: Animal['sexo'];
  categoria: Animal['categoria'];
  dataEntrada: string;
  /** Idade em meses na entrada — o backend deriva a data de nascimento. */
  idadeMeses?: number;
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
  dados: { status: StatusAnimal; dataSaida: string; motivoSaida?: string; pesoSaida?: number },
) {
  return api<Animal>(`/animais/${id}/dar-saida`, { method: 'POST', body: dados });
}

/** Pesagens do animal + o GMD já calculado no servidor. */
export function obterHistoricoPeso(animalId: string) {
  return api<HistoricoPesoAnimal>(`/animais/${animalId}/pesagens`);
}

export function criarPesagemAnimal(animalId: string, dados: NovaPesagemAnimal) {
  return api<PesagemDoAnimal>(`/animais/${animalId}/pesagens`, { method: 'POST', body: dados });
}

export function removerPesagemAnimal(animalId: string, pesagemId: string) {
  return api<{ ok: boolean }>(`/animais/${animalId}/pesagens/${pesagemId}`, { method: 'DELETE' });
}

// ----- Custo de produção do animal -----

/**
 * Custo individual do animal. O `total` soma compra + rateio + diretos; as
 * `ressalvas` dizem em português o que falta pro número estar completo (lote sem
 * dados de compra, insumo sem valor), pra a tela não exibir um total que parece
 * fechado e não está.
 */
export function obterCustoDoAnimal(animalId: string) {
  return api<CustoAnimal>(`/animais/${animalId}/custo`);
}
