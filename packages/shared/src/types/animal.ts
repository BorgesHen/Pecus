import type { SexoAnimal, CategoriaAnimal, StatusAnimal } from '../enums/animal';

export interface Animal {
  id: string;
  empresaId: string;
  loteId?: string | null;
  identificador: string;
  sexo: SexoAnimal;
  categoria: CategoriaAnimal;
  dataNascimento?: string | null;
  dataEntrada: string;
  pesoEntrada?: number | null;
  status: StatusAnimal;
  dataSaida?: string | null;
  motivoSaida?: string | null;
  observacao?: string | null;
  createdAt: string;
}
