import type { SexoAnimal, CategoriaAnimal, StatusAnimal, EspecieAnimal } from '../enums/animal';

export interface Animal {
  id: string;
  empresaId: string;
  loteId?: string | null;
  identificador: string;
  especie: EspecieAnimal;
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
