import type { TipoEventoSanitario } from '../enums/sanidade';

export interface EventoSanitario {
  id: string;
  empresaId: string;
  animalId: string;
  tipo: TipoEventoSanitario;
  nome: string;
  data: string;
  proximaAplicacao?: string | null;
  observacao?: string | null;
  createdAt: string;
}
