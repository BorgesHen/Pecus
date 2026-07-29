'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ModuloSistema, TipoEventoSanitario, LABEL_TIPO_EVENTO_SANITARIO } from '@pecus/shared';
import {
  proximosVencimentos,
  historicoSanitario,
  criarEventoSanitario,
  aplicarEmMassa,
  type EventoSanitarioComAnimal,
} from '@/lib/sanidade';
import { listarAnimais, type AnimalComLote } from '@/lib/animais';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { hojeISO } from '@/lib/data';

type Alvo = 'animal' | 'lote';

const FORM_VAZIO = {
  alvo: 'lote' as Alvo,
  animalId: '',
  loteId: '',
  tipo: TipoEventoSanitario.VACINA,
  nome: '',
  data: new Date().toISOString().slice(0, 10),
  proximaAplicacao: '',
  observacao: '',
};

export default function SanidadePage() {
  const { podeEditar, campoAtivo, configEmpresa } = usePermissoes();
  const podeEditarSanidade = podeEditar(ModuloSistema.SANIDADE);

  const [vencimentos, setVencimentos] = useState<{
    vencidos: EventoSanitarioComAnimal[];
    proximos: EventoSanitarioComAnimal[];
  } | null>(null);
  const [historico, setHistorico] = useState<EventoSanitarioComAnimal[] | null>(null);
  const [animais, setAnimais] = useState<AnimalComLote[]>([]);
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const diasAviso = configEmpresa?.sanidadeDiasAvisoVencimento ?? 7;

  function carregar() {
    proximosVencimentos().then(setVencimentos).catch(() => setVencimentos(null));
    historicoSanitario(20).then(setHistorico).catch(() => setHistorico(null));
  }

  useEffect(() => {
    carregar();
    listarAnimais().then(setAnimais).catch(() => {});
    listarLotes().then(setLotes).catch(() => {});
  }, []);

  function abrirModal() {
    setForm({ ...FORM_VAZIO, animalId: animais[0]?.id ?? '', loteId: lotes[0]?.id ?? '' });
    setModalAberto(true);
  }

  async function salvar() {
    setSalvando(true);
    setErro('');
    try {
      const campos = {
        tipo: form.tipo,
        nome: form.nome,
        data: form.data,
        proximaAplicacao: form.proximaAplicacao || undefined,
        observacao: form.observacao || undefined,
      };
      if (form.alvo === 'animal') {
        await criarEventoSanitario({ ...campos, animalId: form.animalId });
      } else {
        await aplicarEmMassa({ ...campos, loteId: form.loteId });
      }
      setModalAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar evento sanitário');
    } finally {
      setSalvando(false);
    }
  }

  const brData = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Sanidade</h2>
        <button
          className="btn"
          onClick={abrirModal}
          disabled={!podeEditarSanidade || (animais.length === 0 && lotes.length === 0)}
        >
          + Novo evento
        </button>
      </div>

      {erro && <div className="erro">{erro}</div>}

      <div className="grid-cards" style={{ marginBottom: 24 }}>
        <div
          className="card"
          style={
            vencimentos && vencimentos.vencidos.length > 0
              ? { background: 'var(--erro)', color: '#fff' }
              : undefined
          }
        >
          <div
            className="metrica"
            style={vencimentos && vencimentos.vencidos.length > 0 ? { color: '#fff' } : undefined}
          >
            {vencimentos?.vencidos.length ?? '—'}
          </div>
          <div
            className="metrica-label"
            style={
              vencimentos && vencimentos.vencidos.length > 0
                ? { color: 'rgba(255,255,255,0.85)' }
                : undefined
            }
          >
            Vencidos
          </div>
        </div>
        <div className="card">
          <div className="metrica">{vencimentos?.proximos.length ?? '—'}</div>
          <div className="metrica-label">Próximos {diasAviso} dias</div>
        </div>
      </div>

      {vencimentos && (vencimentos.vencidos.length > 0 || vencimentos.proximos.length > 0) && (
        <>
          <h3 style={{ marginBottom: 12 }}>Vencimentos</h3>
          <div className="tabela-wrap" style={{ marginBottom: 24 }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Evento</th>
                  <th>Próxima aplicação</th>
                </tr>
              </thead>
              <tbody>
                {[...vencimentos.vencidos, ...vencimentos.proximos].map((e) => (
                  <tr key={e.id}>
                    <td data-label="Animal">
                      <Link href={`/animais/${e.animalId}`}>{e.animal.identificador}</Link>
                    </td>
                    <td data-label="Evento">
                      {LABEL_TIPO_EVENTO_SANITARIO[e.tipo]} — {e.nome}
                    </td>
                    <td data-label="Próxima aplicação">{brData(e.proximaAplicacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3 style={{ marginBottom: 12 }}>Histórico recente</h3>
      {!historico || historico.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum evento sanitário registrado ainda.</p>
        </div>
      ) : (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Animal</th>
                <th>Tipo</th>
                <th>Nome</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((e) => (
                <tr key={e.id}>
                  <td data-label="Data">{brData(e.data)}</td>
                  <td data-label="Animal">
                    <Link href={`/animais/${e.animalId}`}>{e.animal.identificador}</Link>
                  </td>
                  <td data-label="Tipo">{LABEL_TIPO_EVENTO_SANITARIO[e.tipo]}</td>
                  <td data-label="Nome">{e.nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo evento sanitário</h3>

            <div className="campo">
              <label>Aplicar em</label>
              <select
                className="input"
                value={form.alvo}
                onChange={(e) => setForm({ ...form, alvo: e.target.value as Alvo })}
              >
                <option value="lote">Lote inteiro</option>
                <option value="animal">Um animal</option>
              </select>
            </div>

            {form.alvo === 'lote' ? (
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
            ) : (
              <div className="campo">
                <label>Animal</label>
                <select
                  className="input"
                  value={form.animalId}
                  onChange={(e) => setForm({ ...form, animalId: e.target.value })}
                >
                  {animais.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.identificador}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="linha-campos">
              <div className="campo">
                <label>Tipo</label>
                <select
                  className="input"
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEventoSanitario })}
                >
                  {Object.values(TipoEventoSanitario).map((t) => (
                    <option key={t} value={t}>
                      {LABEL_TIPO_EVENTO_SANITARIO[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Nome (ex: Aftosa, Ivermectina)</label>
                <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
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
              {campoAtivo('sanidade.proximaAplicacao') && (
                <div className="campo">
                  <label>Próxima aplicação (opcional)</label>
                  <input
                    className="input"
                    type="date"
                    value={form.proximaAplicacao}
                    onChange={(e) => setForm({ ...form, proximaAplicacao: e.target.value })}
                  />
                </div>
              )}
            </div>

            {campoAtivo('sanidade.observacao') && (
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
              <button className="btn" onClick={salvar} disabled={salvando || !form.nome}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
