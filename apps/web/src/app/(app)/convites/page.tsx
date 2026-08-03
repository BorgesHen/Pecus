'use client';

import { useEffect, useState } from 'react';
import { listarConvites, criarConvite, removerConvite, type Convite } from '@/lib/convites';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';
import { useToast } from '@/contexts/ToastContext';

export default function ConvitesPage() {
  const toast = useToast();
  const [convites, setConvites] = useState<Convite[] | null>(null);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Convite | null>(null);
  const [codigoCopiado, setCodigoCopiado] = useState('');

  function carregar() {
    listarConvites()
      .then(setConvites)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar convites'));
  }

  useEffect(() => {
    carregar();
  }, []);

  const brData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

  function linkCadastro(codigo: string) {
    return `${window.location.origin}/cadastro?convite=${codigo}`;
  }

  async function copiar(codigo: string) {
    try {
      await navigator.clipboard.writeText(linkCadastro(codigo));
      setCodigoCopiado(codigo);
      setTimeout(() => setCodigoCopiado(''), 2000);
      toast.sucesso('Link de cadastro copiado.');
    } catch {
      // Pode falhar por contexto não seguro (http sem localhost) ou permissão —
      // antes isso era silencioso, então ninguém entendia por que nada acontecia.
      toast.erro('Não foi possível copiar. Copie o código manualmente.');
    }
  }

  async function salvar() {
    setSalvando(true);
    try {
      await criarConvite(observacao.trim() || undefined);
      setModalAberto(false);
      setObservacao('');
      toast.sucesso('Convite criado. Copie o link e mande pro cliente.');
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao criar convite');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const codigo = paraExcluir.codigo;
    try {
      await removerConvite(paraExcluir.id);
      toast.sucesso(`Convite ${codigo} removido.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao remover convite');
    } finally {
      setParaExcluir(null);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Convites de cadastro</h2>
        <button className="btn" onClick={() => setModalAberto(true)}>
          + Novo convite
        </button>
      </div>

      <p style={{ color: 'var(--texto-suave)', marginBottom: 20, fontSize: 14 }}>
        Só é possível criar uma fazenda nova em <code>/cadastro</code> informando um código de
        convite válido e ainda não usado. Gere um convite depois de fechar o negócio com o
        cliente e mande o link pra ele.
      </p>

      {erro && <div className="erro">{erro}</div>}

      {!convites && !erro && <p>Carregando...</p>}

      {convites && convites.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum convite gerado ainda.</p>
        </div>
      )}

      {convites && convites.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Código</th>
                <th>Observação</th>
                <th>Status</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {convites.map((c) => (
                <tr key={c.id}>
                  <td data-label="Código">
                    <code>{c.codigo}</code>
                  </td>
                  <td data-label="Observação">{c.observacao || '—'}</td>
                  <td data-label="Status">
                    {c.usadoEm ? `Usado em ${brData(c.usadoEm)}` : 'Disponível'}
                  </td>
                  <td data-label="Criado em">{brData(c.createdAt)}</td>
                  <td data-label="">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {!c.usadoEm && (
                        <>
                          <button className="btn-secundario" onClick={() => copiar(c.codigo)}>
                            {codigoCopiado === c.codigo ? 'Copiado!' : 'Copiar link'}
                          </button>
                          <button className="btn-perigo" onClick={() => setParaExcluir(c)}>
                            Remover
                          </button>
                        </>
                      )}
                    </div>
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
            <h3>Novo convite</h3>

            <div className="campo">
              <label>Observação (opcional)</label>
              <input
                className="input"
                placeholder="Ex: João - Fazenda Boa Vista"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando}>
                {salvando ? 'Gerando...' : 'Gerar convite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Remover convite?"
          mensagem={`O código "${paraExcluir.codigo}" deixa de funcionar. Essa ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
