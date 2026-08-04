'use client';

import { useEffect, useState } from 'react';
import { EntidadeAtividade, TipoMetodoManejo, LABEL_TIPO_METODO_MANEJO, type MetodoManejo } from '@pecus/shared';
import { listarMetodosManejo, criarMetodoManejo, removerMetodoManejo } from '@/lib/lotes';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { useToast } from '@/contexts/ToastContext';

export default function MetodosManejoPage() {
  const toast = useToast();
  const [metodos, setMetodos] = useState<MetodoManejo[] | null>(null);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoMetodoManejo>(TipoMetodoManejo.NAO_DEFINIDO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<MetodoManejo | null>(null);

  function carregar() {
    listarMetodosManejo()
      .then(setMetodos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar métodos'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirModal() {
    setNome('');
    setTipo(TipoMetodoManejo.NAO_DEFINIDO);
    setModalAberto(true);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await criarMetodoManejo(nome.trim(), tipo);
      setModalAberto(false);
      toast.sucesso(`Método "${nome.trim()}" criado.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar método');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const nomeExcluido = paraExcluir.nome;
    try {
      await removerMetodoManejo(paraExcluir.id);
      toast.sucesso(`Método "${nomeExcluido}" excluído.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir método');
    } finally {
      setParaExcluir(null);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Métodos de manejo</h2>
        <div className="acoes-celula">
          <BotaoHistorico entidade={EntidadeAtividade.METODO_MANEJO} />
          <button className="btn" onClick={abrirModal}>
            + Novo método
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--texto-suave)', marginBottom: 16, fontSize: 14 }}>
        O tipo do método define quais indicadores aparecem no relatório do lote (lotação e ganho
        por hectare, conversão alimentar, custo de saída de recria etc).
      </p>

      {erro && <div className="erro">{erro}</div>}

      {!metodos && !erro && <p>Carregando...</p>}

      {metodos && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Origem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {metodos.map((m) => (
                <tr key={m.id}>
                  <td data-label="Nome">
                    <strong>{m.nome}</strong>
                  </td>
                  <td data-label="Tipo">{LABEL_TIPO_METODO_MANEJO[m.tipo]}</td>
                  <td data-label="Origem">{m.empresaId ? 'Customizado' : 'Padrão do sistema'}</td>
                  <td data-label="">
                    {m.empresaId && (
                      <button className="btn-perigo" onClick={() => setParaExcluir(m)}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo método de manejo</h3>

            <div className="campo">
              <label>Nome</label>
              <input
                className="input"
                value={nome}
                maxLength={60}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div className="campo">
              <label>Tipo</label>
              <select
                className="input"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoMetodoManejo)}
              >
                {Object.values(TipoMetodoManejo).map((t) => (
                  <option key={t} value={t}>
                    {LABEL_TIPO_METODO_MANEJO[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando || !nome.trim()}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Excluir método?"
          mensagem={`O método "${paraExcluir.nome}" será removido. Lotes que usam esse método continuarão existindo, mas ficarão sem método vinculado.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
