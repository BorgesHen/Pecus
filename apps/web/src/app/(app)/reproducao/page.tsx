'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ModuloSistema,
  SexoAnimal,
  EspecieAnimal,
  TipoEventoReprodutivo,
  LABEL_TIPO_EVENTO_REPRODUTIVO,
  LABEL_CATEGORIA_ANIMAL,
  LABEL_SEXO_ANIMAL,
  LABEL_ESPECIE_ANIMAL,
  ESPECIE_CONFIG,
  RECURSO_OVINOS,
} from '@pecus/shared';
import {
  listarMatrizes,
  criarEventoReprodutivo,
  indicadoresReproducao,
  type MatrizComStatus,
  type NovaCria,
  type IndicadoresReproducao,
} from '@/lib/reproducao';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { hojeISO } from '@/lib/data';

const CRIA_VAZIA: NovaCria = { identificador: '', sexo: SexoAnimal.FEMEA };

const FORM_VAZIO = {
  animalId: '',
  tipo: TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO,
  data: new Date().toISOString().slice(0, 10),
  resultado: '',
  observacao: '',
  cadastrarCria: false,
  crias: [{ ...CRIA_VAZIA }] as NovaCria[],
  /** Quantas nasceram no total (pode ser mais que as identificadas com brinco). */
  numeroCrias: 1,
  criaLoteId: '',
};

export default function ReproducaoPage() {
  const toast = useToast();
  const { podeEditar, campoAtivo, temRecurso } = usePermissoes();
  const podeEditarReproducao = podeEditar(ModuloSistema.REPRODUCAO);
  const temOvinos = temRecurso(RECURSO_OVINOS);

  const [matrizes, setMatrizes] = useState<MatrizComStatus[] | null>(null);
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadoresReproducao | null>(null);
  const [especieIndicadores, setEspecieIndicadores] = useState<EspecieAnimal>(EspecieAnimal.BOVINO);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    listarMatrizes()
      .then(setMatrizes)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar matrizes'));
    indicadoresReproducao(especieIndicadores).then(setIndicadores).catch(() => setIndicadores(null));
  }

  useEffect(() => {
    carregar();
    listarLotes().then(setLotes).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especieIndicadores]);

  function abrirModal() {
    setForm({ ...FORM_VAZIO, crias: [{ ...CRIA_VAZIA }], animalId: matrizes?.[0]?.id ?? '' });
    setModalAberto(true);
  }

  /** Espécie da mãe selecionada — define se faz sentido oferecer parto múltiplo. */
  const especieMae = matrizes?.find((m) => m.id === form.animalId)?.especie ?? EspecieAnimal.BOVINO;

  function alterarCria(indice: number, dados: Partial<NovaCria>) {
    setForm((f) => ({
      ...f,
      crias: f.crias.map((c, i) => (i === indice ? { ...c, ...dados } : c)),
    }));
  }

  function adicionarCria() {
    setForm((f) => ({
      ...f,
      crias: [...f.crias, { ...CRIA_VAZIA }],
      numeroCrias: Math.max(f.numeroCrias, f.crias.length + 1),
    }));
  }

  function removerCria(indice: number) {
    setForm((f) => ({ ...f, crias: f.crias.filter((_, i) => i !== indice) }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const ehParto = form.tipo === TipoEventoReprodutivo.PARTO;
      const criasPreenchidas = form.crias.filter((c) => c.identificador.trim() !== '');

      await criarEventoReprodutivo({
        animalId: form.animalId,
        tipo: form.tipo,
        data: form.data,
        resultado: form.resultado || undefined,
        observacao: form.observacao || undefined,
        ...(ehParto
          ? {
              numeroCrias: Math.max(form.numeroCrias, criasPreenchidas.length, 1),
              ...(form.cadastrarCria && criasPreenchidas.length > 0
                ? { crias: criasPreenchidas, criaLoteId: form.criaLoteId || undefined }
                : {}),
            }
          : {}),
      });
      setModalAberto(false);
      const rotulo = LABEL_TIPO_EVENTO_REPRODUTIVO[form.tipo];
      toast.sucesso(
        ehParto && form.cadastrarCria && criasPreenchidas.length > 0
          ? `Parto registrado com ${criasPreenchidas.length} cria(s) cadastrada(s).`
          : `${rotulo} registrado.`,
      );
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar evento reprodutivo');
    } finally {
      setSalvando(false);
    }
  }

  const brData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Reprodução</h2>
        <button className="btn" onClick={abrirModal} disabled={!podeEditarReproducao || !matrizes?.length}>
          + Novo evento
        </button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {indicadores && (indicadores.totalPartos > 0 || indicadores.matrizesAtivas > 0) && (
        <>
          <div className="topo-tela" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Indicadores</h3>
            {temOvinos && (
              <select
                className="input"
                style={{ maxWidth: 220 }}
                value={especieIndicadores}
                onChange={(e) => setEspecieIndicadores(e.target.value as EspecieAnimal)}
              >
                {Object.values(EspecieAnimal).map((especie) => (
                  <option key={especie} value={especie}>
                    {LABEL_ESPECIE_ANIMAL[especie]}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid-cards" style={{ marginBottom: 24 }}>
            <div className="card">
              <div className="metrica">{indicadores.matrizesAtivas}</div>
              <div className="metrica-label">Matrizes/reprodutores ativos</div>
            </div>
            <div className="card">
              <div className="metrica">{indicadores.totalPartos}</div>
              <div className="metrica-label">Partos registrados</div>
            </div>
            <div className="card">
              <div className="metrica">{indicadores.prolificidade ?? '—'}</div>
              <div className="metrica-label">Prolificidade (crias por parto)</div>
            </div>
            <div className="card">
              <div className="metrica">{indicadores.taxaDesmame ?? '—'}</div>
              <div className="metrica-label">Desmames por parto</div>
            </div>
            <div className="card">
              <div className="metrica">
                {indicadores.taxaPrenhez != null ? `${indicadores.taxaPrenhez}%` : '—'}
              </div>
              <div className="metrica-label">Taxa de prenhez</div>
            </div>
          </div>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 24, fontSize: 13 }}>
            Gestação de referência: {ESPECIE_CONFIG[especieIndicadores].diasGestacao} dias.
            {especieIndicadores === EspecieAnimal.OVINO &&
              ' Em ovinos, prolificidade acima de 1,0 é esperada (parto de gêmeos é comum).'}
          </p>
        </>
      )}

      {!matrizes && !erro && <p>Carregando...</p>}

      {matrizes && matrizes.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Cadastre animais com categoria de matriz ou reprodutor
            {temOvinos ? ' (Matriz/Vaca/Touro pra bovinos, Ovelha/Marrã/Carneiro pra ovinos)' : ' (Matriz, Vaca ou Touro)'}
            {' '}em &quot;Animais&quot; pra usar a reprodução.
          </p>
        </div>
      )}

      {matrizes && matrizes.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Categoria</th>
                <th>Lote</th>
                <th>Status reprodutivo</th>
                <th>Último evento</th>
              </tr>
            </thead>
            <tbody>
              {matrizes.map((m) => (
                <tr key={m.id}>
                  <td data-label="Identificador">
                    <Link href={`/animais/${m.id}`}>
                      <strong>{m.identificador}</strong>
                    </Link>
                  </td>
                  <td data-label="Categoria">{LABEL_CATEGORIA_ANIMAL[m.categoria]}</td>
                  <td data-label="Lote">{m.lote?.identificacao ?? '—'}</td>
                  <td data-label="Status reprodutivo">{m.statusReprodutivo ?? '—'}</td>
                  <td data-label="Último evento">
                    {m.ultimoEvento
                      ? `${LABEL_TIPO_EVENTO_REPRODUTIVO[m.ultimoEvento.tipo]} (${brData(m.ultimoEvento.data)})`
                      : '—'}
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
            <h3>Novo evento reprodutivo</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Animal (matriz/touro)</label>
                <select
                  className="input"
                  value={form.animalId}
                  onChange={(e) => setForm({ ...form, animalId: e.target.value })}
                >
                  {matrizes?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.identificador}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Tipo</label>
                <select
                  className="input"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEventoReprodutivo })}
                >
                  {Object.values(TipoEventoReprodutivo).map((t) => (
                    <option key={t} value={t}>
                      {LABEL_TIPO_EVENTO_REPRODUTIVO[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
              </div>
              {campoAtivo('reproducao.resultado') && (
                <div className="campo">
                  <label>Resultado (opcional, ex: Prenha/Vazia)</label>
                  <input
                    className="input"
                    value={form.resultado}
                    onChange={(e) => setForm({ ...form, resultado: e.target.value })}
                  />
                </div>
              )}
            </div>

            {campoAtivo('reproducao.observacao') && (
              <div className="campo">
                <label>Observação (opcional)</label>
                <input
                  className="input"
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </div>
            )}

            {form.tipo === TipoEventoReprodutivo.PARTO && (
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="campo">
                  <label>Quantas crias nasceram</label>
                  <input
                    className="input"
                    style={{ maxWidth: 120 }}
                    type="number"
                    min={1}
                    max={10}
                    value={form.numeroCrias}
                    onChange={(e) => setForm({ ...form, numeroCrias: Number(e.target.value) || 1 })}
                  />
                  <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                    Base do cálculo de prolificidade.
                    {especieMae === EspecieAnimal.OVINO && ' Em ovinos, gêmeos são comuns.'}
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.cadastrarCria}
                    onChange={(e) => setForm({ ...form, cadastrarCria: e.target.checked })}
                  />
                  Cadastrar as crias como animais agora
                </label>

                {form.cadastrarCria && (
                  <div style={{ marginTop: 12 }}>
                    {form.crias.map((cria, i) => (
                      <div key={i} className="linha-campos">
                        <div className="campo">
                          <label>Identificador da cria {form.crias.length > 1 ? i + 1 : ''}</label>
                          <input
                            className="input"
                            value={cria.identificador}
                            onChange={(e) => alterarCria(i, { identificador: e.target.value })}
                          />
                        </div>
                        <div className="campo">
                          <label>Sexo</label>
                          <select
                            className="input"
                            value={cria.sexo}
                            onChange={(e) => alterarCria(i, { sexo: e.target.value as SexoAnimal })}
                          >
                            {Object.values(SexoAnimal).map((s) => (
                              <option key={s} value={s}>
                                {LABEL_SEXO_ANIMAL[s]}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.crias.length > 1 && (
                          <div className="campo" style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
                            <button className="btn-perigo" onClick={() => removerCria(i)}>
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    <button
                      className="btn-secundario"
                      onClick={adicionarCria}
                      disabled={form.crias.length >= 10}
                      style={{ marginBottom: 14 }}
                    >
                      + Outra cria
                    </button>

                    <div className="campo">
                      <label>Lote das crias</label>
                      <select
                        className="input"
                        value={form.criaLoteId}
                        onChange={(e) => setForm({ ...form, criaLoteId: e.target.value })}
                      >
                        <option value="">Mesmo lote da mãe</option>
                        {lotes.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.identificacao}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando || !form.animalId}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
