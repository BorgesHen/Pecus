'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ModuloSistema,
  SexoAnimal,
  TipoEventoReprodutivo,
  LABEL_TIPO_EVENTO_REPRODUTIVO,
  LABEL_CATEGORIA_ANIMAL,
  LABEL_SEXO_ANIMAL,
} from '@pecus/shared';
import { listarMatrizes, criarEventoReprodutivo, type MatrizComStatus } from '@/lib/reproducao';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { hojeISO } from '@/lib/data';

const FORM_VAZIO = {
  animalId: '',
  tipo: TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO,
  data: new Date().toISOString().slice(0, 10),
  resultado: '',
  observacao: '',
  cadastrarCria: false,
  criaIdentificador: '',
  criaSexo: SexoAnimal.FEMEA,
  criaLoteId: '',
};

export default function ReproducaoPage() {
  const { podeEditar, campoAtivo } = usePermissoes();
  const podeEditarReproducao = podeEditar(ModuloSistema.REPRODUCAO);

  const [matrizes, setMatrizes] = useState<MatrizComStatus[] | null>(null);
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    listarMatrizes()
      .then(setMatrizes)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar matrizes'));
  }

  useEffect(() => {
    carregar();
    listarLotes().then(setLotes).catch(() => {});
  }, []);

  function abrirModal() {
    setForm({ ...FORM_VAZIO, animalId: matrizes?.[0]?.id ?? '' });
    setModalAberto(true);
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await criarEventoReprodutivo({
        animalId: form.animalId,
        tipo: form.tipo,
        data: form.data,
        resultado: form.resultado || undefined,
        observacao: form.observacao || undefined,
        ...(form.tipo === TipoEventoReprodutivo.PARTO && form.cadastrarCria && form.criaIdentificador
          ? {
              criaIdentificador: form.criaIdentificador,
              criaSexo: form.criaSexo,
              criaLoteId: form.criaLoteId || undefined,
            }
          : {}),
      });
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar evento reprodutivo');
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

      {!matrizes && !erro && <p>Carregando...</p>}

      {matrizes && matrizes.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Cadastre animais com categoria Matriz, Vaca ou Touro em &quot;Animais&quot; pra usar a
            reprodução.
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
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.cadastrarCria}
                    onChange={(e) => setForm({ ...form, cadastrarCria: e.target.checked })}
                  />
                  Cadastrar a cria agora
                </label>

                {form.cadastrarCria && (
                  <div className="linha-campos" style={{ marginTop: 12 }}>
                    <div className="campo">
                      <label>Identificador da cria</label>
                      <input
                        className="input"
                        value={form.criaIdentificador}
                        onChange={(e) => setForm({ ...form, criaIdentificador: e.target.value })}
                      />
                    </div>
                    <div className="campo">
                      <label>Sexo</label>
                      <select
                        className="input"
                        value={form.criaSexo}
                        onChange={(e) => setForm({ ...form, criaSexo: e.target.value as SexoAnimal })}
                      >
                        {Object.values(SexoAnimal).map((s) => (
                          <option key={s} value={s}>
                            {LABEL_SEXO_ANIMAL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="campo">
                      <label>Lote da cria</label>
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
