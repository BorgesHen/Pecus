import { api } from './api';
import type {
  AcaoAtividade,
  EntidadeAtividade,
  PaginaAtividades,
  RegistroAtividade,
} from '@pecus/shared';

export type { RegistroAtividade };

export interface FiltrosAtividades {
  entidade?: EntidadeAtividade;
  /** Histórico de um registro específico (o botão das telas de detalhe). */
  registroId?: string;
  acao?: AcaoAtividade;
  autorId?: string;
  de?: string;
  ate?: string;
  busca?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarAtividades(filtros: FiltrosAtividades = {}) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    // Filtro vazio não vira parâmetro: `entidade=` na URL seria recusado pelo
    // backend como módulo inválido.
    if (valor !== undefined && valor !== '') params.set(chave, String(valor));
  }
  const query = params.toString();
  return api<PaginaAtividades>(`/atividades${query ? `?${query}` : ''}`);
}

/** Nomes que aparecem no log, pro filtro "feito por". */
export function listarAutoresAtividades() {
  return api<{ id: string; nome: string }[]>('/atividades/autores');
}
