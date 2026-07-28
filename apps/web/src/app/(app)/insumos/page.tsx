'use client';

import { useEffect, useState } from 'react';
import { ModuloSistema } from '@pecus/shared';
import {
  listarInsumos,
  criarInsumo,
  registrarConsumo,
  type InsumoComSaldo,
  type NovoInsumo,
} from '@/lib/insumos';
import { usePermissoes } from '@/contexts/PermissoesContext';

const FORM_VAZIO: NovoInsumo = { nome: '', unidade: 'kg', estoqueMinimo: undefined };

export default function InsumosPage() {
  const { podeEditar, campoAtivo } = usePermissoes();
  const podeEditarEstoque = podeEditar(ModuloSistema.ESTOQUE);

  const [insumos, setInsumos] = useState<InsumoComSaldo[] | null>(null);
  const [erro, setErro] = useState('');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [form, setForm] = useState<NovoInsumo>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [modalConsumoAberto, setModalConsumoAberto] = useState<InsumoComSaldo | null>(null);
  const [quantidadeConsumo, setQuantidadeConsumo] = useState<number | ''>('');
  const [dataConsumo, setDataConsumo] = useState(new Date().toISOString().slice(0, 10));

  function carregar() {
    listarInsumos()
      .then(setInsumos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar insumos'));
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirModalNovo() {
    setForm(FORM_VAZIO);
    setModalNovoAberto(true);
  }

  async function salvarInsumo() {
    setSalvando(true);
    setErro('');
    try {
      await criarInsumo(form);
      setModalNovoAberto(false);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar insumo');
    } finally {
      setSalvando(false);
    }
  }

  function abrirModalConsumo(insumo: InsumoComSaldo) {
    setQuantidadeConsumo('');
    setDataConsumo(new Date().toISOString().slice(0, 10));
    setModalConsumoAberto(insumo);
  }

  async function salvarConsumo() {
    if (!modalConsumoAberto || quantidadeConsumo === '') return;
    setSalvando(true);
    setErro('');
    try {
      await registrarConsumo(modalConsumoAberto.id, {
        quantidade: Number(quantidadeConsumo),
        data: dataConsumo,
      });
      setModalConsumoAberto(null);
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar consumo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Estoque de insumos</h2>
        <button className="btn" onClick={abrirModalNovo} disabled={!podeEditarEstoque}>
          + Novo insumo
        </button>
      </div>

      <p style={{ color: 'var(--texto-suave)', marginBottom: 16, fontSize: 14 }}>
        A entrada acontece automaticamente quando você lança um Gasto vinculado a este insumo (com
        quantidade). O consumo é lançado manualmente aqui.
      </p>

      {erro && <div className="erro">{erro}</div>}

      {!insumos && !erro && <p>Carregando...</p>}

      {insumos && insumos.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum insumo cadastrado ainda.</p>
        </div>
      )}

      {insumos && insumos.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Saldo atual</th>
                <th>Estoque mínimo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const abaixoDoMinimo = i.estoqueMinimo != null && i.saldoAtual < i.estoqueMinimo;
                return (
                  <tr key={i.id}>
                    <td data-label="Nome">
                      <strong>{i.nome}</strong>
                    </td>
                    <td data-label="Unidade">{i.unidade}</td>
                    <td data-label="Saldo atual" style={abaixoDoMinimo ? { color: 'var(--erro)' } : undefined}>
                      {i.saldoAtual} {i.unidade}
                      {abaixoDoMinimo ? ' ⚠' : ''}
                    </td>
                    <td data-label="Estoque mínimo">
                      {i.estoqueMinimo != null ? `${i.estoqueMinimo} ${i.unidade}` : '—'}
                    </td>
                    <td data-label="">
                      <button
                        className="btn-secundario"
                        onClick={() => abrirModalConsumo(i)}
                        disabled={!podeEditarEstoque}
                      >
                        Registrar consumo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalNovoAberto && (
        <div className="modal-overlay" onClick={() => setModalNovoAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo insumo</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Nome</label>
                <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="campo">
                <label>Unidade (ex: kg, L, saco)</label>
                <input
                  className="input"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                />
              </div>
            </div>

            {campoAtivo('estoque.estoqueMinimo') && (
              <div className="campo">
                <label>Estoque mínimo (opcional, pra alertar)</label>
                <input
                  className="input"
                  type="number"
                  value={form.estoqueMinimo ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, estoqueMinimo: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalNovoAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarInsumo} disabled={salvando || !form.nome || !form.unidade}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConsumoAberto && (
        <div className="modal-overlay" onClick={() => setModalConsumoAberto(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar consumo — {modalConsumoAberto.nome}</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Quantidade ({modalConsumoAberto.unidade})</label>
                <input
                  className="input"
                  type="number"
                  value={quantidadeConsumo}
                  onChange={(e) => setQuantidadeConsumo(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  value={dataConsumo}
                  onChange={(e) => setDataConsumo(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalConsumoAberto(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvarConsumo} disabled={salvando || quantidadeConsumo === ''}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
