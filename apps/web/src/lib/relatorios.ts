import { api } from './api';
import type { TipoMetodoManejo } from '@pecus/shared';

export interface CustoArroba {
  custoTotal: number;
  ganhoKgPorAnimal: number;
  ganhoTotalKg: number;
  rendimentoCarcaca: number;
  ganhoArrobas: number;
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
  arrobasProduzidasFase?: number;
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
