import type { TipoMovimentoInsumo } from '../enums/estoque';

export interface Insumo {
  id: string;
  empresaId: string;
  nome: string;
  unidade: string;
  estoqueMinimo?: number | null;
  createdAt: string;
}

export interface MovimentoInsumo {
  id: string;
  empresaId: string;
  insumoId: string;
  tipo: TipoMovimentoInsumo;
  quantidade: number;
  data: string;
  gastoId?: string | null;
  observacao?: string | null;
  createdAt: string;
}
