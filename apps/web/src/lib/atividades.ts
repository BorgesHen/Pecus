import { api } from './api';
import type {
  AcaoAtividade,
  EntidadeAtividade,
  PaginaAtividades,
  RegistroAtividade,
} from '@pecus/shared';

export type { RegistroAtividade };

export interface FiltrosAtividades {
  /**
   * Uma entidade, ou várias separadas por vírgula na URL. A primeira é a da
   * tela (é ela que a rota usa pra autorizar); as outras entram como
   * complemento — ver a rota /atividades.
   */
  entidade?: EntidadeAtividade | EntidadeAtividade[];
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
    if (valor === undefined || valor === '') continue;
    // Lista de entidades vira "animal,pesagem" — o formato que a rota espera.
    params.set(chave, Array.isArray(valor) ? valor.join(',') : String(valor));
  }
  const query = params.toString();
  return api<PaginaAtividades>(`/atividades${query ? `?${query}` : ''}`);
}

/** Nomes que aparecem no log, pro filtro "feito por". */
export function listarAutoresAtividades() {
  return api<{ id: string; nome: string }[]>('/atividades/autores');
}
