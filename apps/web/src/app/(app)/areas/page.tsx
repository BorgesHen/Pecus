'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModuloSistema } from '@pecus/shared';
import { listarAreas, criarArea, removerArea, type AreaComContagem, type NovaArea } from '@/lib/areas';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';

const FORM_VAZIO: NovaArea = { nome: '', areaHectares: undefined };

export default function AreasPage() {
  const router = useRouter();
  const { podeEditar } = usePermissoes();
  const podeEditarAreas = podeEditar(ModuloSistema.AREAS);
  const [areas, setAreas] = useState<AreaComContagem[] | null>(null);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovaArea>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<AreaComContagem | null>(null);

  function carregar() {
    listarAreas()
      .then(setAreas)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar áreas'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirModal() {
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.nome) return;
    setSalvando(true);
    setErro('');
    try {
      await criarArea(form);
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar área');
    } finally {
      setSalvando(false);
    }
  }

  function pedirExclusao(area: AreaComContagem, e: React.MouseEvent) {
    e.stopPropagation();
    setParaExcluir(area);
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    try {
      await removerArea(paraExcluir.id);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir área');
    } finally {
      setParaExcluir(null);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Áreas</h2>
        <button className="btn" onClick={abrirModal} disabled={!podeEditarAreas}>
          + Nova área
        </button>
      </div>

      <p style={{ color: 'var(--texto-suave)', marginBottom: 20, fontSize: 14 }}>
        Cadastro das áreas de pasto — hectares totais e a subdivisão em piquetes pra pastejo
        rotacionado. Vincule um lote a uma área em &quot;Editar parâmetros&quot; na tela do lote.
      </p>

      {erro && <div className="erro">{erro}</div>}

      {!areas && !erro && <p>Carregando...</p>}

      {areas && areas.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Nenhuma área cadastrada ainda. Comece criando a primeira.
          </p>
        </div>
      )}

      {areas && areas.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Hectares</th>
                <th>Piquetes</th>
                <th>Lotes vinculados</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr
                  key={area.id}
                  className="linha-clicavel"
                  onClick={() => router.push(`/areas/${area.id}`)}
                >
                  <td data-label="Nome">
                    <strong>{area.nome}</strong>
                  </td>
                  <td data-label="Hectares">{area.areaHectares ? `${area.areaHectares} ha` : '—'}</td>
                  <td data-label="Piquetes">{area._count.piquetes}</td>
                  <td data-label="Lotes vinculados">{area._count.lotes}</td>
                  <td data-label="">
                    <button
                      className="btn-perigo"
                      onClick={(e) => pedirExclusao(area, e)}
                      disabled={!podeEditarAreas}
                    >
                      Excluir
                    </button>
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
            <h3>Nova área</h3>

            <div className="campo">
              <label>Nome</label>
              <input
                className="input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div className="campo">
              <label>Hectares (opcional)</label>
              <input
                className="input"
                type="number"
                value={form.areaHectares ?? ''}
                onChange={(e) =>
                  setForm({ ...form, areaHectares: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando || !form.nome}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Excluir área?"
          mensagem={`Os piquetes de "${paraExcluir.nome}" (com seus registros de altura e ocupação) também serão removidos, e os lotes vinculados ficam sem área. Esta ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
