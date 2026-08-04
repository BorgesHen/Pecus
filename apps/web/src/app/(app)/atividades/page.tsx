'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ACOES_ATIVIDADE,
  ENTIDADES_ATIVIDADE,
  LABEL_ACAO_ATIVIDADE,
  LABEL_ENTIDADE_ATIVIDADE,
  type AcaoAtividade,
  type EntidadeAtividade,
  type RegistroAtividade,
} from '@pecus/shared';
import { listarAtividades, listarAutoresAtividades } from '@/lib/atividades';
import { ListaAtividades } from '@/components/ListaAtividades';

const POR_PAGINA = 30;

const FILTROS_VAZIOS = {
  entidade: '' as EntidadeAtividade | '',
  acao: '' as AcaoAtividade | '',
  autorId: '',
  de: '',
  ate: '',
};

export default function AtividadesPage() {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [busca, setBusca] = useState('');
  // Busca aplicada (com atraso): sem isso cada letra digitada dispararia uma
  // consulta ao banco.
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [itens, setItens] = useState<RegistroAtividade[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [autores, setAutores] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setBuscaAplicada(busca), 400);
    return () => clearTimeout(timer);
  }, [busca]);

  const carregar = useCallback(
    async (paginaAlvo: number) => {
      setCarregando(true);
      try {
        const resposta = await listarAtividades({
          entidade: filtros.entidade || undefined,
          acao: filtros.acao || undefined,
          autorId: filtros.autorId || undefined,
          de: filtros.de || undefined,
          ate: filtros.ate || undefined,
          busca: buscaAplicada || undefined,
          pagina: paginaAlvo,
          porPagina: POR_PAGINA,
        });
        setItens((atuais) => (paginaAlvo === 1 ? resposta.itens : [...atuais, ...resposta.itens]));
        setTotal(resposta.total);
        setPagina(paginaAlvo);
        setErro('');
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar as atividades');
      } finally {
        setCarregando(false);
      }
    },
    [filtros, buscaAplicada],
  );

  // Qualquer mudança de filtro volta pra primeira página: manter a página 5 de
  // um filtro que agora tem 2 páginas mostraria uma lista vazia sem explicação.
  useEffect(() => {
    carregar(1);
  }, [carregar]);

  useEffect(() => {
    listarAutoresAtividades()
      .then(setAutores)
      // Filtro auxiliar: se falhar, a tela continua utilizável sem ele.
      .catch(() => setAutores([]));
  }, []);

  function limpar() {
    setFiltros(FILTROS_VAZIOS);
    setBusca('');
  }

  const temFiltro = busca !== '' || Object.values(filtros).some((v) => v !== '');
  const temMais = itens.length < total;

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Atividades</h2>
        {temFiltro && (
          <button className="btn-secundario" onClick={limpar}>
            Limpar filtros
          </button>
        )}
      </div>

      <p className="atividade-intro">
        Tudo o que foi cadastrado, editado, excluído e movimentado nesta fazenda, com o autor e a
        data de cada ação.
      </p>

      <div className="card atividade-filtros">
        <div className="campo">
          <label>Módulo</label>
          <select
            className="input"
            value={filtros.entidade}
            onChange={(e) =>
              setFiltros({ ...filtros, entidade: e.target.value as EntidadeAtividade | '' })
            }
          >
            <option value="">Todos</option>
            {ENTIDADES_ATIVIDADE.map((valor) => (
              <option key={valor} value={valor}>
                {LABEL_ENTIDADE_ATIVIDADE[valor]}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Tipo de ação</label>
          <select
            className="input"
            value={filtros.acao}
            onChange={(e) => setFiltros({ ...filtros, acao: e.target.value as AcaoAtividade | '' })}
          >
            <option value="">Todas</option>
            {ACOES_ATIVIDADE.map((valor) => (
              <option key={valor} value={valor}>
                {LABEL_ACAO_ATIVIDADE[valor]}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>Feito por</label>
          <select
            className="input"
            value={filtros.autorId}
            onChange={(e) => setFiltros({ ...filtros, autorId: e.target.value })}
          >
            <option value="">Qualquer pessoa</option>
            {autores.map((autor) => (
              <option key={autor.id} value={autor.id}>
                {autor.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label>De</label>
          <input
            className="input"
            type="date"
            value={filtros.de}
            onChange={(e) => setFiltros({ ...filtros, de: e.target.value })}
          />
        </div>

        <div className="campo">
          <label>Até</label>
          <input
            className="input"
            type="date"
            value={filtros.ate}
            onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })}
          />
        </div>

        <div className="campo">
          <label>Buscar</label>
          <input
            className="input"
            type="text"
            placeholder="Ex: lote 25/26"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}

      {!erro && (
        <>
          {carregando && itens.length === 0 ? (
            <p className="atividade-vazio">Carregando…</p>
          ) : (
            <>
              {total > 0 && (
                <p className="atividade-contagem">
                  Mostrando {itens.length} de {total} atividade(s)
                </p>
              )}
              <ListaAtividades
                itens={itens}
                vazio={
                  temFiltro
                    ? 'Nenhuma atividade encontrada com esses filtros.'
                    : 'Nenhuma atividade registrada ainda.'
                }
              />
            </>
          )}

          {temMais && (
            <button
              className="btn-secundario atividade-mais"
              onClick={() => carregar(pagina + 1)}
              disabled={carregando}
            >
              {carregando ? 'Carregando…' : `Carregar mais (${total - itens.length} restantes)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
