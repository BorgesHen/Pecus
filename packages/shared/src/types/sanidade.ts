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

  /** Insumo consumido na aplicação — o que liga o manejo ao estoque e ao custo. */
  insumoId?: string | null;
  /** Quantidade aplicada, na unidade de cadastro do insumo (0,005 para 5 ml de um produto em L). */
  quantidadeInsumo?: number | null;
  /** Unidade escolhida no lançamento ("ml"), só pra exibir como foi digitado. */
  unidadeInsumo?: string | null;
  /** Custo do insumo aplicado, congelado no dia. Nulo = insumo sem valor de compra. */
  custo?: number | null;
  movimentoInsumoId?: string | null;

  createdAt: string;
}
