'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ModuloSistema,
  SexoAnimal,
  CategoriaAnimal,
  StatusAnimal,
  LABEL_SEXO_ANIMAL,
  LABEL_CATEGORIA_ANIMAL,
  LABEL_STATUS_ANIMAL,
} from '@pecus/shared';
import { listarAnimais, criarAnimal, type AnimalComLote, type NovoAnimal } from '@/lib/animais';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import { usePermissoes } from '@/contexts/PermissoesContext';

const FORM_VAZIO: NovoAnimal = {
  loteId: '',
  identificador: '',
  sexo: SexoAnimal.FEMEA,
  categoria: CategoriaAnimal.BEZERRO,
  dataEntrada: new Date().toISOString().slice(0, 10),
  dataNascimento: undefined,
  pesoEntrada: undefined,
  observacao: '',
};

export default function AnimaisPage() {
  const router = useRouter();
  const { podeEditar, campoAtivo } = usePermissoes();
  const podeEditarAnimais = podeEditar(ModuloSistema.ANIMAIS);

  const [animais, setAnimais] = useState<AnimalComLote[] | null>(null);
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusAnimal | ''>(StatusAnimal.ATIVO);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovoAnimal>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  function carregar() {
    listarAnimais({ loteId: filtroLoteId || undefined, status: filtroStatus || undefined })
      .then(setAnimais)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar animais'));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroLoteId, filtroStatus]);

  useEffect(() => {
    listarLotes().then(setLotes).catch(() => {});
    const loteIdNaUrl = new URLSearchParams(window.location.search).get('loteId');
    if (loteIdNaUrl) setFiltroLoteId(loteIdNaUrl);
  }, []);

  function abrirModal() {
    setForm({ ...FORM_VAZIO, loteId: filtroLoteId || lotes[0]?.id || '' });
    setModalAberto(true);
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      await criarAnimal(form);
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar animal');
    } finally {
      setSalvando(false);
    }
  }

  const brData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Animais</h2>
        <button className="btn" onClick={abrirModal} disabled={!podeEditarAnimais || lotes.length === 0}>
          + Novo animal
        </button>
      </div>

      <div className="linha-campos">
        <div className="campo" style={{ maxWidth: 280 }}>
          <label>Filtrar por lote</label>
          <select className="input" value={filtroLoteId} onChange={(e) => setFiltroLoteId(e.target.value)}>
            <option value="">Todos</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.identificacao}
              </option>
            ))}
          </select>
        </div>
        <div className="campo" style={{ maxWidth: 200 }}>
          <label>Status</label>
          <select
            className="input"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as StatusAnimal | '')}
          >
            <option value="">Todos</option>
            {Object.values(StatusAnimal).map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS_ANIMAL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {!animais && !erro && <p>Carregando...</p>}

      {lotes.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Cadastre um lote antes de registrar animais individuais.
          </p>
        </div>
      )}

      {animais && animais.length === 0 && lotes.length > 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum animal cadastrado ainda.</p>
        </div>
      )}

      {animais && animais.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Identificador</th>
                <th>Categoria</th>
                <th>Sexo</th>
                <th>Lote</th>
                <th>Status</th>
                <th>Entrada</th>
              </tr>
            </thead>
            <tbody>
              {animais.map((a) => (
                <tr key={a.id} className="linha-clicavel" onClick={() => router.push(`/animais/${a.id}`)}>
                  <td data-label="Identificador">
                    <strong>{a.identificador}</strong>
                  </td>
                  <td data-label="Categoria">{LABEL_CATEGORIA_ANIMAL[a.categoria]}</td>
                  <td data-label="Sexo">{LABEL_SEXO_ANIMAL[a.sexo]}</td>
                  <td data-label="Lote">{a.lote?.identificacao ?? '—'}</td>
                  <td data-label="Status">{LABEL_STATUS_ANIMAL[a.status]}</td>
                  <td data-label="Entrada">{brData(a.dataEntrada)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo animal</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Identificador (brinco)</label>
                <input
                  className="input"
                  value={form.identificador}
                  onChange={(e) => setForm({ ...form, identificador: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Lote</label>
                <select
                  className="input"
                  value={form.loteId}
                  onChange={(e) => setForm({ ...form, loteId: e.target.value })}
                >
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.identificacao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label>Sexo</label>
                <select
                  className="input"
                  value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value as SexoAnimal })}
                >
                  {Object.values(SexoAnimal).map((s) => (
                    <option key={s} value={s}>
                      {LABEL_SEXO_ANIMAL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Categoria</label>
                <select
                  className="input"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaAnimal })}
                >
                  {Object.values(CategoriaAnimal).map((c) => (
                    <option key={c} value={c}>
                      {LABEL_CATEGORIA_ANIMAL[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label>Data de entrada</label>
                <input
                  className="input"
                  type="date"
                  value={form.dataEntrada}
                  onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })}
                />
              </div>
              {campoAtivo('animais.dataNascimento') && (
                <div className="campo">
                  <label>Data de nascimento (opcional)</label>
                  <input
                    className="input"
                    type="date"
                    value={form.dataNascimento ?? ''}
                    onChange={(e) => setForm({ ...form, dataNascimento: e.target.value || undefined })}
                  />
                </div>
              )}
            </div>

            {campoAtivo('animais.pesoEntrada') && (
              <div className="campo">
                <label>Peso de entrada (kg, opcional)</label>
                <input
                  className="input"
                  type="number"
                  value={form.pesoEntrada ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, pesoEntrada: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            )}

            {campoAtivo('animais.observacao') && (
              <div className="campo">
                <label>Observação (opcional)</label>
                <input
                  className="input"
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                />
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={salvar}
                disabled={salvando || !form.identificador || !form.loteId}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
