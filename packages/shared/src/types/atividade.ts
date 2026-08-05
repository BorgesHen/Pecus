import type { AcaoAtividade, EntidadeAtividade } from '../enums/atividade';

/** Uma linha da trilha de atividades, como o frontend recebe. */
export interface RegistroAtividade {
  id: string;
  empresaId: string;
  acao: AcaoAtividade;
  entidade: EntidadeAtividade;
  registroId?: string | null;
  /** Registro "dono" do evento (o animal de uma pesagem, por exemplo). */
  contextoId?: string | null;
  descricao: string;
  detalhes?: Record<string, unknown> | null;
  autorId?: string | null;
  autorNome: string;
  autorEmail?: string | null;
  createdAt: string;
}

/** Resposta paginada de GET /atividades. */
export interface PaginaAtividades {
  itens: RegistroAtividade[];
  total: number;
  pagina: number;
  porPagina: number;
}
