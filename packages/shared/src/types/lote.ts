export interface MetodoManejo {
  id: string;
  nome: string;
  empresaId: string | null; // null = método global (seed); preenchido = customizado da fazenda
}

export interface Lote {
  id: string;
  empresaId: string;
  metodoManejoId?: string | null;
  identificacao: string; // ex: "Lote 01/2026"
  dataAquisicao: string;
  quantidadeAnimais: number;
  pesoMedioEntrada?: number | null; // kg
  createdAt: string;
}

export interface Pesagem {
  id: string;
  loteId: string;
  data: string;
  pesoMedio: number; // kg
  createdAt: string;
}
