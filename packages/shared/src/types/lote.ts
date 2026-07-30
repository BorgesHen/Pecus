import type { TipoMetodoManejo } from '../enums/metodo-manejo';
import type { EspecieAnimal } from '../enums/animal';

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
  areaId?: string | null;
  identificacao: string; // ex: "Lote 01/2026"
  especie: EspecieAnimal;
  dataAquisicao: string;
  quantidadeAnimais: number;
  pesoMedioEntrada?: number | null; // kg
  /** % — se nulo, usa o rendimento padrão da espécie (ver ESPECIE_CONFIG). */
  rendimentoCarcaca?: number | null;
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
