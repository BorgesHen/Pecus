import type { TipoMetodoManejo } from '../enums/metodo-manejo';

export interface MetodoManejo {
  id: string;
  nome: string;
  empresaId: string | null; // null = método global (seed); preenchido = customizado da fazenda
  tipo: TipoMetodoManejo;
}

export interface Lote {
  id: string;
  empresaId: string;
  metodoManejoId?: string | null;
  identificacao: string; // ex: "Lote 01/2026"
  dataAquisicao: string;
  quantidadeAnimais: number;
  pesoMedioEntrada?: number | null; // kg
  rendimentoCarcaca?: number | null; // % — se nulo, cálculos assumem 52
  areaHectares?: number | null;
  gmdEsperado?: number | null; // kg/dia, meta de referência
  createdAt: string;
}

export interface Pesagem {
  id: string;
  loteId: string;
  data: string;
  pesoMedio: number; // kg
  createdAt: string;
}

/** Uma fase do lote num método de manejo. dataFim nula = fase atual. */
export interface LoteMetodoHistorico {
  id: string;
  loteId: string;
  metodoManejoId: string;
  dataInicio: string;
  dataFim?: string | null;
  metodoManejo?: MetodoManejo;
}
