'use client';

import { useEffect, useState } from 'react';
import { EntidadeAtividade, CategoriaGasto, ModuloSistema } from '@pecus/shared';
import {
  listarGastos,
  criarGasto,
  removerGasto,
  categoriasCustomizadas,
  type NovoGasto,
} from '@/lib/gastos';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import { listarInsumos, type InsumoComSaldo } from '@/lib/insumos';
import type { Gasto } from '@pecus/shared';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { hojeISO } from '@/lib/data';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';

const FORM_VAZIO: NovoGasto = {
  categoria: CategoriaGasto.RACAO,
  valor: 0,
  data: new Date().toISOString().slice(0, 10),
  loteId: undefined,
  insumoId: undefined,
  descricao: '',
  quantidade: undefined,
  unidade: '',
};

export default function GastosPage() {
  const toast = useToast();
  const { podeEditar, campoAtivo } = usePermissoes();
  const podeEditarGastos = podeEditar(ModuloSistema.GASTOS);
  const [gastos, setGastos] = useState<Gasto[] | null>(null);
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [insumos, setInsumos] = useState<InsumoComSaldo[]>([]);
  const [filtroLoteId, setFiltroLoteId] = useState('');
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovoGasto>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Gasto | null>(null);
  const [categoriasExtras, setCategoriasExtras] = useState<string[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [valorTexto, setValorTexto] = useState('');

  function carregar(loteId: string) {
    listarGastos(loteId || undefined)
      .then(setGastos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar gastos'));
  }

  useEffect(() => {
    carregar(filtroLoteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroLoteId]);

  useEffect(() => {
    listarLotes().then(setLotes).catch(() => {});
    listarInsumos().then(setInsumos).catch(() => {});
    categoriasCustomizadas().then(setCategoriasExtras).catch(() => {});
  }, []);

  function abrirModal() {
    setForm({ ...FORM_VAZIO, loteId: filtroLoteId || undefined });
    setNovaCategoria('');
    setValorTexto('');
    setModalAberto(true);
  }

  function alterarValor(texto: string) {
    let v = texto.replace(/[^0-9,]/g, '');
    const partes = v.split(',');
    if (partes.length > 2) v = partes[0] + ',' + partes.slice(1).join('');
    setValorTexto(v);
    const numerico = Number(v.replace(',', '.'));
    setForm({ ...form, valor: v && !isNaN(numerico) ? numerico : 0 });
  }

  function cadastrarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) return;
    setCategoriasExtras((atual) => (atual.includes(nome) ? atual : [...atual, nome]));
    setForm({ ...form, categoria: nome });
    setNovaCategoria('');
  }

  async function salvar() {
    setSalvando(true);
    try {
      await criarGasto(form);
      setModalAberto(false);
      toast.sucesso(`Gasto de ${brl(form.valor)} lançado em "${form.categoria}".`);
      carregar(filtroLoteId);
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar gasto');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const excluido = paraExcluir;
    try {
      await removerGasto(excluido.id);
      toast.sucesso(`Gasto de ${brl(excluido.valor)} excluído.`);
      carregar(filtroLoteId);
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir gasto');
    } finally {
      setParaExcluir(null);
    }
  }

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const brData = (d: string) => new Date(d).toLocaleDateString('pt-BR');
  const nomeLote = (id?: string | null) => lotes.find((l) => l.id === id)?.identificacao ?? 'Geral';

  const total = gastos?.reduce((acc, g) => acc + Number(g.valor), 0) ?? 0;

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Gastos</h2>
        <div className="acoes-celula">
          <BotaoHistorico entidade={EntidadeAtividade.GASTO} />
          <button className="btn" onClick={abrirModal} disabled={!podeEditarGastos}>
            + Novo gasto
          </button>
        </div>
      </div>

      <div className="campo" style={{ maxWidth: 320 }}>
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

      {erro && <div className="erro">{erro}</div>}

      {!gastos && !erro && <p>Carregando...</p>}

      {gastos && (
        <>
          <div className="card" style={{ marginBottom: 20, maxWidth: 260 }}>
            <div className="metrica">{brl(total)}</div>
            <div className="metrica-label">Total do filtro atual</div>
          </div>

          {gastos.length === 0 ? (
            <div className="card">
              <p style={{ color: 'var(--texto-suave)' }}>Nenhum gasto lançado ainda.</p>
            </div>
          ) : (
            <div className="tabela-wrap">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Categoria</th>
                    <th>Descrição</th>
                    <th>Qtd.</th>
                    <th>Lote</th>
                    <th>Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((g) => (
                    <tr key={g.id}>
                      <td data-label="Data">{brData(g.data)}</td>
                      <td data-label="Categoria">{g.categoria}</td>
                      <td data-label="Descrição">{g.descricao || '—'}</td>
                      <td data-label="Qtd.">{g.quantidade ? `${g.quantidade} ${g.unidade ?? ''}` : '—'}</td>
                      <td data-label="Lote">{nomeLote(g.loteId)}</td>
                      <td data-label="Valor">{brl(Number(g.valor))}</td>
                      <td data-label="">
                        <button
                          className="btn-perigo"
                          onClick={() => setParaExcluir(g)}
                          disabled={!podeEditarGastos}
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
        </>
      )}

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo gasto</h3>

            <div className="linha-campos">
              <div className="campo">
                <label>Categoria</label>
                <select
                  className="input"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  {Object.values(CategoriaGasto)
                    .filter((c) => c !== CategoriaGasto.OUTROS)
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  {categoriasExtras
                    .filter((c) => !(Object.values(CategoriaGasto) as string[]).includes(c))
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  <option value={CategoriaGasto.OUTROS}>{CategoriaGasto.OUTROS}</option>
                </select>

                {form.categoria === CategoriaGasto.OUTROS && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      className="input"
                      placeholder="Nome da nova categoria"
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-secundario"
                      onClick={cadastrarCategoria}
                      disabled={!novaCategoria.trim()}
                    >
                      Cadastrar categoria
                    </button>
                  </div>
                )}
              </div>
              <div className="campo">
                <label>Valor (R$)</label>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={valorTexto}
                  onChange={(e) => alterarValor(e.target.value)}
                />
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
              {campoAtivo('gastos.loteId') && (
                <div className="campo">
                  <label>Lote</label>
                  <select
                    className="input"
                    value={form.loteId ?? ''}
                    onChange={(e) => setForm({ ...form, loteId: e.target.value || undefined })}
                  >
                    <option value="">Geral (sem lote)</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.identificacao}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {campoAtivo('gastos.descricao') && (
              <div className="campo">
                <label>Descrição (opcional)</label>
                <input
                  className="input"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            )}

            <div className="linha-campos">
              {campoAtivo('gastos.quantidade') && (
                <div className="campo">
                  <label>Quantidade (opcional)</label>
                  <input
                    className="input"
                    type="number"
                    value={form.quantidade ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, quantidade: e.target.value ? Number(e.target.value) : undefined })
                    }
                  />
                </div>
              )}
              {campoAtivo('gastos.unidade') && (
                <div className="campo">
                  <label>Unidade (ex: L, kg, saco)</label>
                  <input
                    className="input"
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  />
                </div>
              )}
            </div>

            {insumos.length > 0 && campoAtivo('gastos.insumoId') && (
              <div className="campo">
                <label>Insumo (opcional — lança entrada no estoque com a quantidade acima)</label>
                <select
                  className="input"
                  value={form.insumoId ?? ''}
                  onChange={(e) => setForm({ ...form, insumoId: e.target.value || undefined })}
                >
                  <option value="">Nenhum</option>
                  {insumos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Excluir gasto?"
          mensagem={`O gasto de ${brl(Number(paraExcluir.valor))} em "${paraExcluir.categoria}" será removido. Esta ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
