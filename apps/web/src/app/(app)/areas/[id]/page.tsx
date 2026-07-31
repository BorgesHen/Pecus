'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ModuloSistema, type RegistroAlturaPasto } from '@pecus/shared';
import { obterArea, atualizarArea, type AreaDetalhada } from '@/lib/areas';
import { hojeISO } from '@/lib/data';
import {
  listarPiquetes,
  criarPiquete,
  removerPiquete,
  registrarAlturaPasto,
  listarAlturasPasto,
  moverGadoParaPiquete,
  type PiqueteComStatus,
} from '@/lib/piquetes';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';

export default function DetalheAreaPage() {
  const params = useParams<{ id: string }>();
  const areaId = params.id;
  const { podeEditar, configEmpresa } = usePermissoes();
  const podeEditarAreas = podeEditar(ModuloSistema.AREAS);
  const podeEditarPiquetes = podeEditar(ModuloSistema.PIQUETES);

  const [area, setArea] = useState<AreaDetalhada | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [modalParametrosAberto, setModalParametrosAberto] = useState(false);
  const [parametros, setParametros] = useState({ nome: '', areaHectares: '' as number | '' });

  const [piquetes, setPiquetes] = useState<PiqueteComStatus[] | null>(null);
  const [historicoAlturaAberto, setHistoricoAlturaAberto] = useState<string | null>(null);
  const [historicoAltura, setHistoricoAltura] = useState<RegistroAlturaPasto[] | null>(null);

  const [modalNovoPiqueteAberto, setModalNovoPiqueteAberto] = useState(false);
  const [formPiquete, setFormPiquete] = useState({
    nome: '',
    areaHectares: '' as number | '',
    alturaIdealCm: '' as number | '',
  });

  const [modalAlturaAberto, setModalAlturaAberto] = useState<PiqueteComStatus | null>(null);
  const [dataAltura, setDataAltura] = useState(new Date().toISOString().slice(0, 10));
  const [alturaCm, setAlturaCm] = useState<number | ''>('');

  const [modalMoverAberto, setModalMoverAberto] = useState<PiqueteComStatus | null>(null);
  const [dataMovimento, setDataMovimento] = useState(new Date().toISOString().slice(0, 10));

  const [paraExcluirPiquete, setParaExcluirPiquete] = useState<PiqueteComStatus | null>(null);

  function carregar() {
    obterArea(areaId)
      .then(setArea)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar área'));
  }

  function carregarPiquetes() {
    listarPiquetes(areaId).then(setPiquetes).catch(() => setPiquetes(null));
  }

  useEffect(() => {
    carregar();
    carregarPiquetes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId]);

  function abrirModalParametros() {
    if (!area) return;
    setParametros({ nome: area.nome, areaHectares: area.areaHectares ?? '' });
    setModalParametrosAberto(true);
  }

  async function salvarParametros() {
    if (!parametros.nome) return;
    setSalvando(true);
    setErro('');
    try {
      await atualizarArea(areaId, {
        nome: parametros.nome,
        areaHectares: parametros.areaHectares === '' ? undefined : parametros.areaHectares,
      });
      setModalParametrosAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar parâmetros');
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalNovoPiquete() {
    setFormPiquete({ nome: '', areaHectares: '', alturaIdealCm: '' });
    setModalNovoPiqueteAberto(true);
  }

  async function salvarNovoPiquete() {
    if (!formPiquete.nome) return;
    setSalvando(true);
    setErro('');
    try {
      await criarPiquete({
        areaId,
        nome: formPiquete.nome,
        areaHectares: formPiquete.areaHectares === '' ? undefined : formPiquete.areaHectares,
        alturaIdealCm: formPiquete.alturaIdealCm === '' ? undefined : formPiquete.alturaIdealCm,
      });
      setModalNovoPiqueteAberto(false);
      carregarPiquetes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar piquete');
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalAltura(piquete: PiqueteComStatus) {
    setDataAltura(new Date().toISOString().slice(0, 10));
    setAlturaCm('');
    setModalAlturaAberto(piquete);
  }

  async function salvarAltura() {
    if (!modalAlturaAberto || alturaCm === '') return;
    setSalvando(true);
    setErro('');
    try {
      await registrarAlturaPasto(modalAlturaAberto.id, { data: dataAltura, alturaCm: Number(alturaCm) });
      const piqueteId = modalAlturaAberto.id;
      setModalAlturaAberto(null);
      carregarPiquetes();
      if (historicoAlturaAberto === piqueteId) {
        listarAlturasPasto(piqueteId).then(setHistoricoAltura).catch(() => {});
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar altura');
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalMover(piquete: PiqueteComStatus) {
    setDataMovimento(new Date().toISOString().slice(0, 10));
    setModalMoverAberto(piquete);
  }

  async function confirmarMoverGado() {
    if (!modalMoverAberto) return;
    setSalvando(true);
    setErro('');
    try {
      await moverGadoParaPiquete(modalMoverAberto.id, { data: dataMovimento });
      setModalMoverAberto(null);
      carregarPiquetes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao mover o gado');
    } finally {
      setSalvando(false);
    }
  }

  function alternarHistoricoAltura(piqueteId: string) {
    if (historicoAlturaAberto === piqueteId) {
      setHistoricoAlturaAberto(null);
      setHistoricoAltura(null);
      return;
    }
    setHistoricoAlturaAberto(piqueteId);
    listarAlturasPasto(piqueteId).then(setHistoricoAltura).catch(() => setHistoricoAltura([]));
  }

  async function confirmarExclusaoPiquete() {
    if (!paraExcluirPiquete) return;
    try {
      await removerPiquete(paraExcluirPiquete.id);
      if (historicoAlturaAberto === paraExcluirPiquete.id) setHistoricoAlturaAberto(null);
      carregarPiquetes();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir piquete');
    } finally {
      setParaExcluirPiquete(null);
    }
  }

  const brData = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  if (erro && !area) {
    return (
      <div className="container">
        <div className="erro">{erro}</div>
      </div>
    );
  }

  if (!area) {
    return (
      <div className="container">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <Link href="/areas" style={{ fontSize: 14, display: 'inline-block', marginBottom: 12 }}>
        ← Voltar
      </Link>

      <div className="topo-tela">
        <h2>{area.nome}</h2>
        <button className="btn-secundario" onClick={abrirModalParametros} disabled={!podeEditarAreas}>
          Editar
        </button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="metrica">{area.areaHectares ? `${area.areaHectares} ha` : '—'}</div>
          <div className="metrica-label">Hectares totais</div>
        </div>
        <div className="card">
          <div className="metrica">{area.piquetes.length}</div>
          <div className="metrica-label">Piquetes</div>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Lotes usando esta área</h3>
      {area.lotes.length === 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum lote vinculado a esta área ainda.</p>
        </div>
      ) : (
        <div className="tabela-wrap" style={{ marginBottom: 24 }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Lote</th>
              </tr>
            </thead>
            <tbody>
              {area.lotes.map((l) => (
                <tr key={l.id}>
                  <td data-label="Lote">
                    <Link href={`/lotes/${l.id}`}>{l.identificacao}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="topo-tela">
        <h3>Piquetes</h3>
        <button className="btn-secundario" onClick={abrirModalNovoPiquete} disabled={!podeEditarPiquetes}>
          + Novo piquete
        </button>
      </div>

      {!piquetes && !erro && <p>Carregando...</p>}

      {piquetes && piquetes.length === 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum piquete cadastrado ainda.</p>
        </div>
      )}

      {piquetes &&
        piquetes.map((p) => {
          // alturaIdealEfetiva nula = fazenda desligou a altura ideal nas Configurações,
          // então não há como (nem por que) julgar se o piquete está pronto.
          const pronto =
            p.alturaIdealEfetiva != null &&
            !p.ocupadoAtualmente &&
            p.ultimaAltura != null &&
            p.ultimaAltura.alturaCm >= p.alturaIdealEfetiva;
          return (
            <div key={p.id} className="card" style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <strong>{p.nome}</strong>{' '}
                  {p.ocupadoAtualmente && (
                    <span
                      style={{
                        background: 'var(--verde)',
                        color: '#fff',
                        borderRadius: 999,
                        padding: '2px 10px',
                        fontSize: 12,
                      }}
                    >
                      Ocupado atualmente
                    </span>
                  )}
                  {pronto && (
                    <span
                      style={{
                        background: '#c17f1e',
                        color: '#fff',
                        borderRadius: 999,
                        padding: '2px 10px',
                        fontSize: 12,
                        marginLeft: 6,
                      }}
                    >
                      Pronto pra receber o gado
                    </span>
                  )}
                  <p style={{ color: 'var(--texto-suave)', fontSize: 14, marginTop: 6 }}>
                    {p.areaHectares ? `${p.areaHectares} ha` : ''}
                    {p.alturaIdealEfetiva != null && (
                      <>
                        {p.areaHectares ? ' — ' : ''}
                        Altura ideal: {p.alturaIdealCm ?? p.alturaIdealEfetiva} cm
                        {p.alturaIdealCm == null ? ' (padrão da fazenda)' : ''}
                      </>
                    )}
                  </p>
                  <p style={{ color: 'var(--texto-suave)', fontSize: 14 }}>
                    Última altura:{' '}
                    {p.ultimaAltura ? `${p.ultimaAltura.alturaCm} cm (${brData(p.ultimaAltura.data)})` : '—'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn-secundario"
                    onClick={() => abrirModalAltura(p)}
                    disabled={!podeEditarPiquetes}
                  >
                    Registrar altura
                  </button>
                  <button
                    className="btn-secundario"
                    onClick={() => abrirModalMover(p)}
                    disabled={!podeEditarPiquetes || p.ocupadoAtualmente}
                  >
                    Mover gado pra aqui
                  </button>
                  <button
                    className="btn-perigo"
                    onClick={() => setParaExcluirPiquete(p)}
                    disabled={!podeEditarPiquetes}
                  >
                    Excluir
                  </button>
                </div>
              </div>

              <button
                className="btn-secundario"
                style={{ marginTop: 12, fontSize: 13 }}
                onClick={() => alternarHistoricoAltura(p.id)}
              >
                {historicoAlturaAberto === p.id ? 'Ocultar histórico' : 'Ver histórico de altura'}
              </button>

              {historicoAlturaAberto === p.id && (
                <div style={{ marginTop: 12 }}>
                  {!historicoAltura || historicoAltura.length === 0 ? (
                    <p style={{ color: 'var(--texto-suave)', fontSize: 14 }}>
                      Nenhum registro de altura ainda.
                    </p>
                  ) : (
                    <div className="tabela-wrap">
                      <table className="tabela">
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Altura</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicoAltura.map((h) => (
                            <tr key={h.id}>
                              <td data-label="Data">{brData(h.data)}</td>
                              <td data-label="Altura">{h.alturaCm} cm</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

      {modalParametrosAberto && (
        <div className="modal-overlay" onClick={() => setModalParametrosAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Editar área</h3>

            <div className="campo">
              <label>Nome</label>
              <input
                className="input"
                value={parametros.nome}
                onChange={(e) => setParametros({ ...parametros, nome: e.target.value })}
              />
            </div>
            <div className="campo">
              <label>Hectares (opcional)</label>
              <input
                className="input"
                type="number"
                value={parametros.areaHectares}
                onChange={(e) =>
                  setParametros({
                    ...parametros,
                    areaHectares: e.target.value ? Number(e.target.value) : '',
                  })
                }
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalParametrosAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarParametros} disabled={salvando || !parametros.nome}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalNovoPiqueteAberto && (
        <div className="modal-overlay" onClick={() => setModalNovoPiqueteAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo piquete</h3>

            <div className="campo">
              <label>Nome</label>
              <input
                className="input"
                value={formPiquete.nome}
                onChange={(e) => setFormPiquete({ ...formPiquete, nome: e.target.value })}
              />
            </div>
            <div className="linha-campos">
              <div className="campo">
                <label>Área (ha, opcional)</label>
                <input
                  className="input"
                  type="number"
                  value={formPiquete.areaHectares}
                  onChange={(e) =>
                    setFormPiquete({
                      ...formPiquete,
                      areaHectares: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                />
              </div>
              {(configEmpresa?.alturaIdealPastoAtiva ?? true) && (
                <div className="campo">
                  <label>Altura ideal (cm, opcional)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder={`${configEmpresa?.alturaIdealPastoPadrao ?? 60} (padrão)`}
                    value={formPiquete.alturaIdealCm}
                    onChange={(e) =>
                      setFormPiquete({
                        ...formPiquete,
                        alturaIdealCm: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalNovoPiqueteAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarNovoPiquete} disabled={salvando || !formPiquete.nome}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAlturaAberto && (
        <div className="modal-overlay" onClick={() => setModalAlturaAberto(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar altura — {modalAlturaAberto.nome}</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={dataAltura}
                  onChange={(e) => setDataAltura(e.target.value)}
                />
              </div>
              <div className="campo">
                <label>Altura (cm)</label>
                <input
                  className="input"
                  type="number"
                  value={alturaCm}
                  onChange={(e) => setAlturaCm(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAlturaAberto(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarAltura} disabled={salvando || alturaCm === ''}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMoverAberto && (
        <div className="modal-overlay" onClick={() => setModalMoverAberto(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mover gado pra {modalMoverAberto.nome}</h3>

            <div className="campo">
              <label>Data do movimento</label>
              <input
                className="input"
                type="date"
                max={hojeISO()}
                value={dataMovimento}
                onChange={(e) => setDataMovimento(e.target.value)}
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalMoverAberto(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={confirmarMoverGado} disabled={salvando}>
                {salvando ? 'Movendo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluirPiquete && (
        <PopupConfirmacao
          titulo="Excluir piquete?"
          mensagem={
            paraExcluirPiquete.ocupadoAtualmente
              ? `O piquete "${paraExcluirPiquete.nome}" está com o gado atualmente. Excluir vai remover o histórico de ocupação e de altura dele. Esta ação não pode ser desfeita.`
              : `Os registros de altura e de ocupação de "${paraExcluirPiquete.nome}" também serão removidos. Esta ação não pode ser desfeita.`
          }
          onConfirmar={confirmarExclusaoPiquete}
          onCancelar={() => setParaExcluirPiquete(null)}
        />
      )}
    </div>
  );
}
