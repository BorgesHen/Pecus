import type { TipoEventoReprodutivo } from '../enums/reproducao';

export interface EventoReprodutivo {
  id: string;
  empresaId: string;
  animalId: string;
  tipo: TipoEventoReprodutivo;
  data: string;
  resultado?: string | null;
  criaId?: string | null;
  /**
   * Nº de crias nascidas no parto — base do cálculo de prolificidade. Ovinos
   * pare gêmeos/trigêmeos com frequência; bovino é quase sempre cria única.
   */
  numeroCrias?: number | null;
  observacao?: string | null;
  createdAt: string;
}
