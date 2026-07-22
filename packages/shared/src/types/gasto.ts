export interface Gasto {
  id: string;
  empresaId: string;
  loteId?: string | null; // null = gasto geral da fazenda, não atribuído a um lote
  categoria: string;
  descricao?: string | null;
  valor: number;
  quantidade?: number | null; // ex: litros de combustível, sacos de ração
  unidade?: string | null; // ex: "L", "kg", "saco"
  data: string;
  createdAt: string;
}
