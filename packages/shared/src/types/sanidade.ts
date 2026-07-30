import type { TipoEventoSanitario } from '../enums/sanidade';

export interface EventoSanitario {
  id: string;
  empresaId: string;
  animalId: string;
  tipo: TipoEventoSanitario;
  nome: string;
  data: string;
  proximaAplicacao?: string | null;
  /** Grau FAMACHA 1-5 (manejo ovino) — ver GRAUS_FAMACHA. */
  escoreFamacha?: number | null;
  /** Escore de condição corporal 1-5, aceita meio ponto. */
  escoreCorporal?: number | null;
  observacao?: string | null;
  createdAt: string;
}
