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
  /**
   * Dados da compra (simulador de aquisição). Nulos = lote cadastrado sem
   * passar pelo simulador. `pesoMedioCompra` é o peso negociado, diferente de
   * `pesoMedioEntrada`, que é o peso na entrada da pastagem. Frete e comissão
   * são sempre por cabeça — ver calcularCompraLote.
   */
  pesoMedioCompra?: number | null; // kg
  valorKgCompra?: number | null; // R$/kg
  fretePorCabeca?: number | null; // R$
  comissaoPorCabeca?: number | null; // R$
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
