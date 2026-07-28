import type { TipoEventoReprodutivo } from '../enums/reproducao';

export interface EventoReprodutivo {
  id: string;
  empresaId: string;
  animalId: string;
  tipo: TipoEventoReprodutivo;
  data: string;
  resultado?: string | null;
  criaId?: string | null;
  observacao?: string | null;
  createdAt: string;
}
