'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ModuloSistema,
  LABEL_TIPO_METODO_MANEJO,
  TIPOS_METODO_A_PASTO,
  type MetodoManejo,
  type RegistroAlturaPasto,
} from '@pecus/shared';
import {
  obterLote,
  atualizarLote,
  trocarMetodoLote,
  listarMetodosManejo,
  type LoteDetalhado,
} from '@/lib/lotes';
import { criarPesagem, obterGmd, type Gmd } from '@/lib/pesagens';
import { indicadoresMetodo, type IndicadoresMetodo } from '@/lib/relatorios';
import { listarAnimais } from '@/lib/animais';
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

export default function DetalheLotePage() {
  const params = useParams<{ id: string }>();
  const loteId = params.id;
  const { podeEditar, podeAcessar, configEmpresa } = usePermissoes();
  const podeRegistrarPesagem = podeEditar(ModuloSistema.PESAGENS);
  const podeEditarLote = podeEditar(ModuloSistema.LOTES);
  const podeEditarPiquetes = podeEditar(ModuloSistema.PIQUETES);
  const mostrarPiquetes = (configEmpresa?.moduloPiquetesAtivo ?? true) && podeAcessar(ModuloSistema.PIQUETES);

  const [lote, setLote] = useState<LoteDetalhado | null>(null);
  const [gmd, setGmd] = useState<Gmd | null>(null);
  const [indicadores, setIndicadores] = useState<IndicadoresMetodo | null>(null);
  const [totalAnimaisCadastrados, setTotalAnimaisCadastrados] = useState<number | null>(null);
  const [metodos, setMetodos] = useState<MetodoManejo[]>([]);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [pesoMedio, setPesoMedio] = useState<number | ''>('');
  const [salvando, setSalvando] = useState(false);

  const [modalParametrosAberto, setModalParametrosAberto] = useState(false);
  const [parametros, setParametros] = useState({
    rendimentoCarcaca: '' as number | '',
    areaHectares: '' as number | '',
    gmdEsperado: '' as number | '',
  });

  const [modalTrocarMetodoAberto, setModalTrocarMetodoAberto] = useState(false);
  const [novoMetodoId, setNovoMetodoId] = useState('');
  const [dataTroca, setDataTroca] = useState(new Date().toISOString().slice(0, 10));

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
    obterLote(loteId)
      .then(setLote)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar lote'));
    obterGmd(loteId).then(setGmd).catch(() => {});
    indicadoresMetodo(loteId)
      .then(setIndicadores)
      .catch(() => setIndicadores(null));
    listarAnimais({ loteId })
      .then((lista) => setTotalAnimaisCadastrados(lista.length))
      .catch(() => setTotalAnimaisCadastrados(null));
  }

  function carregarPiquetes() {
    if (!mostrarPiquetes) return;
    listarPiquetes(loteId).then(setPiquetes).catch(() => setPiquetes(null));
  }

  useEffect(() => {
    carregar();
    carregarPiquetes();
    listarMetodosManejo().then(setMetodos).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId]);

  function abrirModalParametros() {
    if (!lote) return;
    setParametros({
      rendimentoCarcaca: lote.rendimentoCarcaca ?? '',
      areaHectares: lote.areaHectares ?? '',
      gmdEsperado: lote.gmdEsperado ?? '',
    });
    setModalParametrosAberto(true);
  }

  async function salvarParametros() {
    setSalvando(true);
    setErro('');
    try {
      await atualizarLote(loteId, {
        rendimentoCarcaca: parametros.rendimentoCarcaca === '' ? undefined : parametros.rendimentoCarcaca,
        areaHectares: parametros.areaHectares === '' ? undefined : parametros.areaHectares,
        gmdEsperado: parametros.gmdEsperado === '' ? undefined : parametros.gmdEsperado,
      });
      setModalParametrosAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar parâmetros');
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalTrocarMetodo() {
    setNovoMetodoId('');
    setDataTroca(new Date().toISOString().slice(0, 10));
    setModalTrocarMetodoAberto(true);
  }

  async function confirmarTrocaMetodo() {
    if (!novoMetodoId) return;
    setSalvando(true);
    setErro('');
    try {
      await trocarMetodoLote(loteId, { metodoManejoId: novoMetodoId, dataTroca });
      setModalTrocarMetodoAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao trocar método');
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
        loteId,
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

  function abrirModal() {
    setData(new Date().toISOString().slice(0, 10));
    setPesoMedio('');
    setModalAberto(true);
  }

  async function salvar() {
    if (pesoMedio === '') return;
    setSalvando(true);
    setErro('');
    try {
      await criarPesagem({ loteId, data, pesoMedio: Number(pesoMedio) });
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar pesagem');
    } finally {
      setSalvando(false);
    }
  }

  const brData = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  if (erro && !lote) {
    return (
      <div className="container">
        <div className="erro">{erro}</div>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="container">
        <p>Carregando...</p>
      </div>
    );
  }

  const pontos: { label: string; peso: number }[] = [];
  if (lote.pesoMedioEntrada) {
    pontos.push({ label: `Entrada (${brData(lote.dataAquisicao)})`, peso: lote.pesoMedioEntrada });
  }
  lote.pesagens.forEach((p) => pontos.push({ label: brData(p.data), peso: p.pesoMedio }));

  return (
    <div className="container">
      <Link href="/lotes" style={{ fontSize: 14, display: 'inline-block', marginBottom: 12 }}>
        ← Voltar
      </Link>

      <div className="topo-tela">
        <h2>{lote.identificacao}</h2>
        <button className="btn" onClick={abrirModal} disabled={!podeRegistrarPesagem}>
          + Nova pesagem
        </button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>Método de manejo</div>
            <strong>{lote.metodoManejo?.nome ?? 'Não definido'}</strong>
            {lote.metodoManejo && (
              <span style={{ color: 'var(--texto-suave)', fontSize: 14 }}>
                {' '}
                — {LABEL_TIPO_METODO_MANEJO[lote.metodoManejo.tipo]}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-secundario"
              onClick={abrirModalParametros}
              disabled={!podeEditarLote}
            >
              Editar parâmetros
            </button>
            <button className="btn-secundario" onClick={abrirModalTrocarMetodo} disabled={!podeEditarLote}>
              Trocar método
            </button>
          </div>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="metrica">{lote.quantidadeAnimais}</div>
          <div className="metrica-label">Animais</div>
        </div>
        <div className="card">
          <div className="metrica">{lote.pesoMedioEntrada ? `${lote.pesoMedioEntrada} kg` : '—'}</div>
          <div className="metrica-label">Peso de entrada</div>
        </div>
        <div className="card">
          <div className="metrica">{gmd?.gmd != null ? `${gmd.gmd} kg/dia` : '—'}</div>
          <div className="metrica-label">GMD</div>
        </div>
        <div className="card">
          <div className="metrica">{lote.pesagens.length}</div>
          <div className="metrica-label">Pesagens</div>
        </div>
        <div className="card">
          <div className="metrica">{totalAnimaisCadastrados ?? '—'}</div>
          <div className="metrica-label">
            <Link href={`/animais?loteId=${lote.id}`}>Animais cadastrados</Link>
          </div>
        </div>
      </div>

      {gmd?.mensagem && (
        <p style={{ color: 'var(--texto-suave)', marginBottom: 24, fontSize: 14 }}>{gmd.mensagem}</p>
      )}

      <h3 style={{ marginBottom: 12 }}>Evolução do peso</h3>
      <div className="card" style={{ marginBottom: 24 }}>
        <GraficoPeso pontos={pontos} />
      </div>

      {indicadores?.temMetodo && (
        <>
          <h3 style={{ marginBottom: 12 }}>Indicadores do método ({indicadores.metodoNome})</h3>
          <div className="grid-cards" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="metrica">
                {indicadores.gmdFase != null ? `${indicadores.gmdFase} kg/dia` : '—'}
              </div>
              <div className="metrica-label">
                GMD da fase{indicadores.gmdEsperado != null ? ` (meta: ${indicadores.gmdEsperado})` : ''}
              </div>
            </div>
            <div className="card">
              <div className="metrica">
                {indicadores.custoPorArrobaFase != null
                  ? indicadores.custoPorArrobaFase.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  : '—'}
              </div>
              <div className="metrica-label">Custo por arroba da fase (RC {indicadores.rendimentoCarcaca}%)</div>
            </div>

            {indicadores.indicadores?.lotacaoUaHa !== undefined && (
              <div className="card">
                <div className="metrica">
                  {indicadores.indicadores.lotacaoUaHa != null
                    ? `${indicadores.indicadores.lotacaoUaHa} UA/ha`
                    : '—'}
                </div>
                <div className="metrica-label">Lotação</div>
              </div>
            )}
            {indicadores.indicadores?.ganhoPorHectare !== undefined && (
              <div className="card">
                <div className="metrica">
                  {indicadores.indicadores.ganhoPorHectare != null
                    ? `${indicadores.indicadores.ganhoPorHectare} kg/ha`
                    : '—'}
                </div>
                <div className="metrica-label">Ganho por hectare</div>
              </div>
            )}
            {indicadores.indicadores?.conversaoAlimentar !== undefined && (
              <div className="card">
                <div className="metrica">
                  {indicadores.indicadores.conversaoAlimentar != null
                    ? `${indicadores.indicadores.conversaoAlimentar} kg MS/kg`
                    : '—'}
                </div>
                <div className="metrica-label">Conversão alimentar</div>
              </div>
            )}
            {indicadores.indicadores?.custoSaidaRecria !== undefined && (
              <div className="card">
                <div className="metrica">
                  {indicadores.indicadores.custoSaidaRecria.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                <div className="metrica-label">Custo acumulado da recria</div>
              </div>
            )}
          </div>
          {(!lote.areaHectares || indicadores.indicadores?.lotacaoUaHa === null) &&
            indicadores.tipoMetodo &&
            TIPOS_METODO_A_PASTO.includes(indicadores.tipoMetodo) && (
              <p style={{ color: 'var(--texto-suave)', marginBottom: 24, fontSize: 14 }}>
                Cadastre a área de pasto do lote em &quot;Editar parâmetros&quot; para ver lotação e
                ganho por hectare.
              </p>
            )}
        </>
      )}

      <h3 style={{ marginBottom: 12 }}>Histórico de método</h3>
      {lote.metodoHistorico.length === 0 ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ color: 'var(--texto-suave)' }}>Nenhuma troca de método registrada.</p>
        </div>
      ) : (
        <div className="tabela-wrap" style={{ marginBottom: 24 }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Método</th>
                <th>Início</th>
                <th>Fim</th>
              </tr>
            </thead>
            <tbody>
              {lote.metodoHistorico.map((h) => (
                <tr key={h.id}>
                  <td data-label="Método">{h.metodoManejo?.nome}</td>
                  <td data-label="Início">{brData(h.dataInicio)}</td>
                  <td data-label="Fim">{h.dataFim ? brData(h.dataFim) : 'Atual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarPiquetes && (
        <>
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
              const pronto =
                !p.ocupadoAtualmente && p.ultimaAltura != null && p.ultimaAltura.alturaCm >= p.alturaIdealEfetiva;
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
                        {p.areaHectares ? `${p.areaHectares} ha — ` : ''}
                        Altura ideal: {p.alturaIdealCm ?? p.alturaIdealEfetiva} cm
                        {p.alturaIdealCm == null ? ' (padrão da fazenda)' : ''}
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
        </>
      )}

      <h3 style={{ marginBottom: 12 }}>Pesagens</h3>
      {lote.pesagens.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhuma pesagem registrada ainda.</p>
        </div>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Peso médio</th>
              </tr>
            </thead>
            <tbody>
              {[...lote.pesagens].reverse().map((p) => (
                <tr key={p.id}>
                  <td data-label="Data">{brData(p.data)}</td>
                  <td data-label="Peso médio">{p.pesoMedio} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nova pesagem</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Data</label>
                <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
              <div className="campo">
                <label>Peso médio (kg)</label>
                <input
                  className="input"
                  type="number"
                  value={pesoMedio}
                  onChange={(e) => setPesoMedio(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando || pesoMedio === ''}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalParametrosAberto && (
        <div className="modal-overlay" onClick={() => setModalParametrosAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Editar parâmetros</h3>

            <div className="campo">
              <label>Rendimento de carcaça (%)</label>
              <input
                className="input"
                type="number"
                placeholder="52 (padrão)"
                value={parametros.rendimentoCarcaca}
                onChange={(e) =>
                  setParametros({
                    ...parametros,
                    rendimentoCarcaca: e.target.value ? Number(e.target.value) : '',
                  })
                }
              />
            </div>
            <div className="campo">
              <label>Área de pasto (ha)</label>
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
            <div className="campo">
              <label>GMD esperado (kg/dia)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={parametros.gmdEsperado}
                onChange={(e) =>
                  setParametros({
                    ...parametros,
                    gmdEsperado: e.target.value ? Number(e.target.value) : '',
                  })
                }
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalParametrosAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarParametros} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalTrocarMetodoAberto && (
        <div className="modal-overlay" onClick={() => setModalTrocarMetodoAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Trocar método de manejo</h3>

            <div className="campo">
              <label>Novo método</label>
              <select
                className="input"
                value={novoMetodoId}
                onChange={(e) => setNovoMetodoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {metodos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label>Data da troca</label>
              <input
                className="input"
                type="date"
                value={dataTroca}
                onChange={(e) => setDataTroca(e.target.value)}
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalTrocarMetodoAberto(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={confirmarTrocaMetodo}
                disabled={salvando || !novoMetodoId}
              >
                {salvando ? 'Salvando...' : 'Confirmar'}
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

function GraficoPeso({ pontos }: { pontos: { label: string; peso: number }[] }) {
  if (pontos.length < 2) {
    return (
      <p style={{ color: 'var(--texto-suave)' }}>
        Registre ao menos duas pesagens (ou um peso de entrada + uma pesagem) para ver o gráfico de evolução.
      </p>
    );
  }

  const larguraBase = 600;
  const alturaBase = 200;
  const margem = 16;

  const pesos = pontos.map((p) => p.peso);
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);
  const variacao = max - min || 1;

  const coords = pontos.map((p, i) => {
    const x = margem + (i / (pontos.length - 1)) * (larguraBase - margem * 2);
    const y = alturaBase - margem - ((p.peso - min) / variacao) * (alturaBase - margem * 2);
    return { x, y, ...p };
  });

  const linha = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${larguraBase} ${alturaBase}`} width="100%" height="200" preserveAspectRatio="none">
        <polyline points={linha} fill="none" stroke="var(--verde)" strokeWidth={3} />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={4} fill="var(--verde)" />
        ))}
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 13,
          color: 'var(--texto-suave)',
          marginTop: 8,
        }}
      >
        <span>
          {primeiro.label}: <strong>{primeiro.peso} kg</strong>
        </span>
        <span>
          {ultimo.label}: <strong>{ultimo.peso} kg</strong>
        </span>
      </div>
    </div>
  );
}
