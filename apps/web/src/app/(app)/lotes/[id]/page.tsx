'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ModuloSistema,
  LABEL_TIPO_METODO_MANEJO,
  TIPOS_METODO_A_PASTO,
  LABEL_ESPECIE_ANIMAL,
  ESPECIE_CONFIG,
  calcularCompraLote,
  temDadosDeCompra,
  RECURSO_OVINOS,
  type MetodoManejo,
} from '@pecus/shared';
import {
  obterLote,
  atualizarLote,
  trocarMetodoLote,
  listarMetodosManejo,
  type LoteDetalhado,
} from '@/lib/lotes';
import { listarAreas, type AreaComContagem } from '@/lib/areas';
import { criarPesagem, obterGmd, type Gmd } from '@/lib/pesagens';
import { hojeISO } from '@/lib/data';
import { indicadoresMetodo, type IndicadoresMetodo } from '@/lib/relatorios';
import { listarAnimais } from '@/lib/animais';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { SimuladorCompra, type DadosCompraSimulada } from '@/components/SimuladorCompra';

export default function DetalheLotePage() {
  const toast = useToast();
  const params = useParams<{ id: string }>();
  const loteId = params.id;
  const { podeEditar, temRecurso } = usePermissoes();
  const temOvinos = temRecurso(RECURSO_OVINOS);
  const podeRegistrarPesagem = podeEditar(ModuloSistema.PESAGENS);
  const podeEditarLote = podeEditar(ModuloSistema.LOTES);

  const [lote, setLote] = useState<LoteDetalhado | null>(null);
  const [gmd, setGmd] = useState<Gmd | null>(null);
  const [indicadores, setIndicadores] = useState<IndicadoresMetodo | null>(null);
  const [totalAnimaisCadastrados, setTotalAnimaisCadastrados] = useState<number | null>(null);
  const [metodos, setMetodos] = useState<MetodoManejo[]>([]);
  const [areas, setAreas] = useState<AreaComContagem[]>([]);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [pesoMedio, setPesoMedio] = useState<number | ''>('');
  const [salvando, setSalvando] = useState(false);
  const [simuladorAberto, setSimuladorAberto] = useState(false);

  const [modalParametrosAberto, setModalParametrosAberto] = useState(false);
  const [parametros, setParametros] = useState({
    rendimentoCarcaca: '' as number | '',
    areaId: '',
    gmdEsperado: '' as number | '',
  });

  const [modalTrocarMetodoAberto, setModalTrocarMetodoAberto] = useState(false);
  const [novoMetodoId, setNovoMetodoId] = useState('');
  const [dataTroca, setDataTroca] = useState(new Date().toISOString().slice(0, 10));

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

  useEffect(() => {
    carregar();
    listarMetodosManejo().then(setMetodos).catch(() => {});
    listarAreas().then(setAreas).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteId]);

  function abrirModalParametros() {
    if (!lote) return;
    setParametros({
      rendimentoCarcaca: lote.rendimentoCarcaca ?? '',
      areaId: lote.areaId ?? '',
      gmdEsperado: lote.gmdEsperado ?? '',
    });
    setModalParametrosAberto(true);
  }

  async function salvarParametros() {
    setSalvando(true);
    try {
      await atualizarLote(loteId, {
        rendimentoCarcaca: parametros.rendimentoCarcaca === '' ? undefined : parametros.rendimentoCarcaca,
        areaId: parametros.areaId || undefined,
        gmdEsperado: parametros.gmdEsperado === '' ? undefined : parametros.gmdEsperado,
      });
      setModalParametrosAberto(false);
      toast.sucesso('Parâmetros do lote salvos.');
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar parâmetros');
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
    try {
      await trocarMetodoLote(loteId, { metodoManejoId: novoMetodoId, dataTroca });
      setModalTrocarMetodoAberto(false);
      toast.sucesso('Método de manejo trocado.');
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao trocar método');
    } finally {
      setSalvando(false);
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
    try {
      await criarPesagem({ loteId, data, pesoMedio: Number(pesoMedio) });
      setModalAberto(false);
      toast.sucesso(`Pesagem de ${pesoMedio} kg registrada.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar pesagem');
    } finally {
      setSalvando(false);
    }
  }

  const brData = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  /** Corrigir a compra depois usa o mesmo simulador do cadastro, via PATCH. */
  async function salvarCompra(dados: DadosCompraSimulada) {
    setSalvando(true);
    const mudouQuantidade = dados.quantidadeAnimais !== lote?.quantidadeAnimais;
    try {
      await atualizarLote(loteId, {
        // A quantidade vai junto: o simulador mostra o total do lote em função
        // dela, então descartá-la aqui deixaria o total exibido mentindo.
        quantidadeAnimais: dados.quantidadeAnimais,
        pesoMedioCompra: dados.pesoMedioCompra,
        valorKgCompra: dados.valorKgCompra,
        fretePorCabeca: dados.fretePorCabeca,
        comissaoPorCabeca: dados.comissaoPorCabeca,
      });
      setSimuladorAberto(false);
      toast.sucesso(
        mudouQuantidade
          ? `Custo da compra atualizado e lote ajustado para ${dados.quantidadeAnimais} cabeça(s).`
          : 'Custo da compra atualizado.',
      );
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar o custo da compra');
    } finally {
      setSalvando(false);
    }
  }

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

  // Cordeiro ganha ~200-300 g/dia; em kg/dia o número fica ilegível (0,25).
  const resumoCompra = calcularCompraLote({
    pesoMedioCompra: lote.pesoMedioCompra ?? 0,
    valorKgCompra: lote.valorKgCompra ?? 0,
    fretePorCabeca: lote.fretePorCabeca ?? 0,
    comissaoPorCabeca: lote.comissaoPorCabeca ?? 0,
    quantidadeAnimais: lote.quantidadeAnimais,
  });

  const gmdEmGramas = ESPECIE_CONFIG[lote.especie].gmdEmGramas;
  const formatarGmd = (kgPorDia: number) =>
    gmdEmGramas ? `${Math.round(kgPorDia * 1000)} g/dia` : `${kgPorDia} kg/dia`;

  const custoCarcacaFase = indicadores?.temMetodo
    ? indicadores.vendePorArroba === false
      ? indicadores.custoPorKgCarcacaFase
      : indicadores.custoPorArrobaFase
    : null;

  return (
    <div className="container">
      <Link href="/lotes" className="link-voltar">
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
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            {temOvinos && (
              <div>
                <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>Espécie</div>
                <strong>{LABEL_ESPECIE_ANIMAL[lote.especie]}</strong>
              </div>
            )}
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
            <div>
              <div style={{ fontSize: 14, color: 'var(--texto-suave)' }}>Área</div>
              {lote.area ? (
                <Link href={`/areas/${lote.area.id}`}>
                  <strong>{lote.area.nome}</strong> →
                </Link>
              ) : (
                <strong style={{ color: 'var(--texto-suave)' }}>Não vinculada</strong>
              )}
            </div>
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

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="topo-tela" style={{ marginBottom: 12 }}>
          <strong>Custo da compra</strong>
          <button
            className="btn-secundario"
            onClick={() => setSimuladorAberto(true)}
            disabled={!podeEditarLote}
          >
            {temDadosDeCompra(lote) ? 'Recalcular' : 'Registrar compra'}
          </button>
        </div>

        {temDadosDeCompra(lote) ? (
          <>
            <div className="compra-resumo">
              <div className="compra-resumo-item">
                <span>Custo por cabeça</span>
                <strong>{brl(resumoCompra.custoPorCabeca)}</strong>
              </div>
              <div className="compra-resumo-item">
                <span>Total do lote</span>
                <strong>{brl(resumoCompra.custoTotal)}</strong>
              </div>
              <div className="compra-resumo-item">
                <span>Custo real por kg</span>
                <strong>{brl(resumoCompra.custoRealPorKg)}</strong>
              </div>
              <div className="compra-resumo-item">
                <span>Peso médio de compra</span>
                <strong>{lote.pesoMedioCompra} kg</strong>
              </div>
            </div>
            <p style={{ color: 'var(--texto-suave)', fontSize: 13 }}>
              Negociado a {brl(lote.valorKgCompra ?? 0)}/kg
              {resumoCompra.custoAcessorioPorCabeca > 0 && (
                <>
                  {' '}+ {brl(resumoCompra.custoAcessorioPorCabeca)} por cabeça de frete e comissão
                </>
              )}
              .
            </p>
          </>
        ) : (
          <p style={{ color: 'var(--texto-suave)', fontSize: 14 }}>
            Este lote foi cadastrado sem o custo da compra. Registre pra ter o custo por cabeça e o
            total investido.
          </p>
        )}
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
          <div className="metrica">{gmd?.gmd != null ? formatarGmd(gmd.gmd) : '—'}</div>
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
                {indicadores.gmdFase != null ? formatarGmd(indicadores.gmdFase) : '—'}
              </div>
              <div className="metrica-label">
                GMD da fase{indicadores.gmdEsperado != null ? ` (meta: ${indicadores.gmdEsperado})` : ''}
              </div>
            </div>
            <div className="card">
              <div className="metrica">
                {custoCarcacaFase != null
                  ? custoCarcacaFase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : '—'}
              </div>
              <div className="metrica-label">
                {indicadores.vendePorArroba === false ? 'Custo por kg de carcaça' : 'Custo por arroba'} da
                fase (RC {indicadores.rendimentoCarcaca}%)
              </div>
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
          {(!lote.area?.areaHectares || indicadores.indicadores?.lotacaoUaHa === null) &&
            indicadores.tipoMetodo &&
            TIPOS_METODO_A_PASTO.includes(indicadores.tipoMetodo) && (
              <p style={{ color: 'var(--texto-suave)', marginBottom: 24, fontSize: 14 }}>
                Cadastre uma <Link href="/areas">área</Link> com hectares e vincule em &quot;Editar
                parâmetros&quot; para ver lotação e ganho por hectare.
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

      {simuladorAberto && (
        <SimuladorCompra
          valoresIniciais={{
            quantidadeAnimais: lote.quantidadeAnimais,
            pesoMedioCompra: lote.pesoMedioCompra ?? undefined,
            valorKgCompra: lote.valorKgCompra ?? undefined,
            fretePorCabeca: lote.fretePorCabeca ?? undefined,
            comissaoPorCabeca: lote.comissaoPorCabeca ?? undefined,
          }}
          textoConfirmar="Salvar custo da compra"
          salvando={salvando}
          onConfirmar={salvarCompra}
          onCancelar={() => setSimuladorAberto(false)}
        />
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nova pesagem</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
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
              <label>Área</label>
              <select
                className="input"
                value={parametros.areaId}
                onChange={(e) => setParametros({ ...parametros, areaId: e.target.value })}
              >
                <option value="">Não vinculada</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
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
                max={hojeISO()}
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
