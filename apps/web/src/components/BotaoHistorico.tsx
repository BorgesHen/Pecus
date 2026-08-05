'use client';

import { useCallback, useEffect, useState } from 'react';
import { History } from 'lucide-react';
import {
  ACOES_ATIVIDADE,
  LABEL_ACAO_ATIVIDADE,
  LABEL_ENTIDADE_ATIVIDADE,
  type AcaoAtividade,
  type EntidadeAtividade,
  type RegistroAtividade,
} from '@pecus/shared';
import { listarAtividades } from '@/lib/atividades';
import { useToast } from '@/contexts/ToastContext';
import { ListaAtividades } from './ListaAtividades';

const POR_PAGINA = 20;

/**
 * Botão "Histórico" + a janela que ele abre.
 *
 * Serve pros dois usos: no topo de uma tela (histórico do módulo inteiro) e
 * dentro de um registro (`registroId`, histórico só daquele lote/animal/área).
 * Só busca quando é aberto — a tela não paga nada por ter o botão.
 *
 * `entidade` aceita uma lista quando a tela junta módulos — a do animal usa
 * `[ANIMAL, PESAGEM]` pra que cadastro e exclusão de pesagem apareçam junto
 * das alterações do animal. A primeira da lista é a da tela: manda no título e
 * é ela que a rota usa pra autorizar.
 */
export function BotaoHistorico({
  entidade,
  registroId,
  titulo,
  rotulo = 'Histórico',
}: {
  entidade: EntidadeAtividade | EntidadeAtividade[];
  registroId?: string;
  titulo?: string;
  rotulo?: string;
}) {
  const entidades = Array.isArray(entidade) ? entidade : [entidade];
  const principal = entidades[0];
  // Chave estável pro useCallback: um array literal na prop muda de identidade
  // a cada render da tela e recriaria `carregar` sem necessidade.
  const chaveEntidades = entidades.join(',');

  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<RegistroAtividade[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [acao, setAcao] = useState<AcaoAtividade | ''>('');
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(
    async (paginaAlvo: number, acaoAlvo: AcaoAtividade | '') => {
      setCarregando(true);
      try {
        const resposta = await listarAtividades({
          entidade: chaveEntidades.split(',') as EntidadeAtividade[],
          registroId,
          acao: acaoAlvo || undefined,
          pagina: paginaAlvo,
          porPagina: POR_PAGINA,
        });
        // Página 1 substitui (troca de filtro); as seguintes acumulam.
        setItens((atuais) => (paginaAlvo === 1 ? resposta.itens : [...atuais, ...resposta.itens]));
        setTotal(resposta.total);
        setPagina(paginaAlvo);
      } catch (e) {
        toast.erroDe(e, 'Erro ao carregar o histórico');
      } finally {
        setCarregando(false);
      }
    },
    [chaveEntidades, registroId, toast],
  );

  useEffect(() => {
    if (aberto) carregar(1, acao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, acao]);

  function fechar() {
    setAberto(false);
    // Zera pra próxima abertura não mostrar por um instante o histórico antigo.
    setItens([]);
    setTotal(0);
    setAcao('');
  }

  const temMais = itens.length < total;

  return (
    <>
      <button className="btn-secundario" onClick={() => setAberto(true)}>
        <History size={14} aria-hidden /> {rotulo}
      </button>

      {aberto && (
        <div className="modal-overlay" onClick={fechar}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{titulo ?? `Histórico — ${LABEL_ENTIDADE_ATIVIDADE[principal]}`}</h3>

            <div className="campo" style={{ maxWidth: 260 }}>
              <label>Tipo de ação</label>
              <select
                className="input"
                value={acao}
                onChange={(e) => setAcao(e.target.value as AcaoAtividade | '')}
              >
                <option value="">Todas</option>
                {ACOES_ATIVIDADE.map((valor) => (
                  <option key={valor} value={valor}>
                    {LABEL_ACAO_ATIVIDADE[valor]}
                  </option>
                ))}
              </select>
            </div>

            {carregando && itens.length === 0 ? (
              <p className="atividade-vazio">Carregando…</p>
            ) : (
              <ListaAtividades
                itens={itens}
                // Com módulos misturados a etiqueta passa a ser necessária pra
                // distinguir "Animais" de "Pesagens" numa mesma lista.
                mostrarModulo={entidades.length > 1}
                vazio={
                  acao
                    ? 'Nenhuma atividade desse tipo por aqui.'
                    : registroId
                      ? 'Nenhuma atividade registrada para este registro.'
                      : 'Nenhuma atividade registrada ainda.'
                }
              />
            )}

            {temMais && (
              <button
                className="btn-secundario atividade-mais"
                onClick={() => carregar(pagina + 1, acao)}
                disabled={carregando}
              >
                {carregando ? 'Carregando…' : `Carregar mais (${total - itens.length} restantes)`}
              </button>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={fechar}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
