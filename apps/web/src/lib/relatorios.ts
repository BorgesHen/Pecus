import { api } from './api';
import type { TipoMetodoManejo, EspecieAnimal } from '@pecus/shared';

export interface CustoArroba {
  especie: EspecieAnimal;
  /** Bovino se vende em arroba; ovino, por kg de carcaça. */
  vendePorArroba: boolean;
  custoTotal: number;
  ganhoKgPorAnimal: number;
  ganhoTotalKg: number;
  rendimentoCarcaca: number;
  ganhoCarcacaKg: number;
  custoPorKgCarcaca: number | null;
  ganhoArrobas: number | null;
  custoPorArroba: number | null;
  erro?: string;
}

export function custoPorArroba(loteId: string) {
  return api<CustoArroba>(`/relatorios/custo-arroba/${loteId}`);
}

export interface IndicadoresMetodo {
  temMetodo: boolean;
  mensagem?: string;
  erro?: string;
  especie?: EspecieAnimal;
  vendePorArroba?: boolean;
  /** Ovino: exibir GMD em g/dia, porque cordeiro ganha centenas de gramas por dia. */
  gmdEmGramas?: boolean;
  tipoMetodo?: TipoMetodoManejo;
  metodoNome?: string;
  faseAtual?: boolean;
  faseInicio?: string;
  dias?: number;
  gmdFase?: number;
  gmdEsperado?: number | null;
  rendimentoCarcaca?: number;
  ganhoTotalKgFase?: number;
  custoTotalFase?: number;
  carcacaProduzidaKgFase?: number;
  custoPorKgCarcacaFase?: number | null;
  arrobasProduzidasFase?: number | null;
  custoPorArrobaFase?: number | null;
  indicadores?: {
    lotacaoUaHa?: number | null;
    ganhoPorHectare?: number | null;
    conversaoAlimentar?: number | null;
    custoAlimentacaoFase?: number;
    custoSaidaRecria?: number;
  };
}

export function indicadoresMetodo(loteId: string) {
  return api<IndicadoresMetodo>(`/relatorios/indicadores-metodo/${loteId}`);
}
