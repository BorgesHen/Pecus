'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  EntidadeAtividade,
  ModuloSistema,
  NaturezaFinanceira,
  LABEL_NATUREZA_FINANCEIRA,
  LABEL_FORMA_PAGAMENTO,
  FormaPagamento,
  StatusLancamento,
  LABEL_STATUS_LANCAMENTO,
} from '@pecus/shared';
import {
  listarLancamentos,
  criarLancamento,
  liquidarLancamento,
  removerLancamento,
  listarPlanoContas,
  listarBancos,
  listarContatos,
  type GrupoComContas,
  type LancamentoDetalhado,
  type NovoLancamento,
} from '@/lib/financeiro';
import { brData, hojeISO } from '@/lib/data';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import type { ContaBancaria, Contato } from '@pecus/shared';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';

const FORM_VAZIO: NovoLancamento = {
  contaId: '',
  valorTotal: 0,
  dataDocumento: new Date().toISOString().slice(0, 10),
  dataVencimento: new Date().toISOString().slice(0, 10),
  totalParcelas: 1,
};

const CORES_STATUS: Record<StatusLancamento, string> = {
  [StatusLancamento.LIQUIDADO]: 'var(--verde)',
  [StatusLancamento.ATRASADO]: 'var(--erro)',
  [StatusLancamento.EM_ABERTO]: 'var(--texto-suave)',
};

export default function FinanceiroPage() {
  const toast = useToast();
  const { podeEditar, campoAtivo } = usePermissoes();
  const podeEditarFinanceiro = podeEditar(ModuloSistema.FINANCEIRO);

  const [lancamentos, setLancamentos] = useState<LancamentoDetalhado[] | null>(null);
  const [grupos, setGrupos] = useState<GrupoComContas[]>([]);
  const [bancos, setBancos] = useState<ContaBancaria[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [erro, setErro] = useState('');

  const [filtroNatureza, setFiltroNatureza] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroLoteId, setFiltroLoteId] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [natureza, setNatureza] = useState<NaturezaFinanceira>(NaturezaFinanceira.DESPESA);
  const [form, setForm] = useState<NovoLancamento>(FORM_VAZIO);
  const [valorTexto, setValorTexto] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [liquidando, setLiquidando] = useState<LancamentoDetalhado | null>(null);
  const [dataLiquidacao, setDataLiquidacao] = useState('');
  const [bancoLiquidacao, setBancoLiquidacao] = useState('');

  const [paraExcluir, setParaExcluir] = useState<LancamentoDetalhado | null>(null);

  function carregar() {
    listarLancamentos({
      natureza: (filtroNatureza as NaturezaFinanceira) || undefined,
      status: (filtroStatus as 'aberto' | 'liquidado') || undefined,
      loteId: filtroLoteId || undefined,
    })
      .then(setLancamentos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar lançamentos'));
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroNatureza, filtroStatus, filtroLoteId]);

  useEffect(() => {
    listarPlanoContas().then(setGrupos).catch(() => {});
    listarBancos().then(setBancos).catch(() => {});
    listarContatos().then(setContatos).catch(() => {});
    listarLotes().then(setLotes).catch(() => {});
  }, []);

  function abrirModal() {
    setNatureza(NaturezaFinanceira.DESPESA);
    setForm(FORM_VAZIO);
    setValorTexto('');
    setModalAberto(true);
  }

  function alterarValor(texto: string) {
    let v = texto.replace(/[^0-9,]/g, '');
    const partes = v.split(',');
    if (partes.length > 2) v = partes[0] + ',' + partes.slice(1).join('');
    setValorTexto(v);
    const numerico = Number(v.replace(',', '.'));
    setForm({ ...form, valorTotal: v && !isNaN(numerico) ? numerico : 0 });
  }

  async function salvar() {
    setSalvando(true);
    try {
      await criarLancamento(form);
      setModalAberto(false);
      toast.sucesso(`Lançamento de ${brl(form.valorTotal)} registrado.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar lançamento');
    } finally {
      setSalvando(false);
    }
  }

  function abrirLiquidar(l: LancamentoDetalhado) {
    setLiquidando(l);
    setDataLiquidacao(new Date().toISOString().slice(0, 10));
    setBancoLiquidacao(l.contaBancariaId ?? '');
  }

  async function confirmarLiquidar() {
    if (!liquidando) return;
    try {
      await liquidarLancamento(liquidando.id, {
        dataLiquidacao,
        contaBancariaId: bancoLiquidacao || undefined,
      });
      setLiquidando(null);
      toast.sucesso(`Lançamento de ${brl(liquidando.valorTotal)} liquidado.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao liquidar lançamento');
    }
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const valor = paraExcluir.valorTotal;
    try {
      await removerLancamento(paraExcluir.id);
      toast.sucesso(`Lançamento de ${brl(valor)} excluído.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir lançamento');
    } finally {
      setParaExcluir(null);
    }
  }

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const contasDaNatureza = grupos
    .filter((g) => g.natureza === natureza)
    .flatMap((g) => g.contas.filter((c) => c.ativo).map((c) => ({ ...c, grupoNome: g.nome })));

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Financeiro</h2>
        <div className="acoes-celula">
          <BotaoHistorico entidade={EntidadeAtividade.LANCAMENTO} />
          <Link href="/financeiro/plano-contas" className="btn-secundario">
            Plano de contas
          </Link>
          <Link href="/financeiro/contatos-bancos" className="btn-secundario">
            Bancos &amp; contatos
          </Link>
          <button className="btn" onClick={abrirModal} disabled={!podeEditarFinanceiro}>
            + Novo lançamento
          </button>
        </div>
      </div>

      <div className="linha-campos" style={{ marginBottom: 16 }}>
        <div className="campo">
          <label>Natureza</label>
          <select className="input" value={filtroNatureza} onChange={(e) => setFiltroNatureza(e.target.value)}>
            <option value="">Todas</option>
            <option value={NaturezaFinanceira.RECEITA}>Receita</option>
            <option value={NaturezaFinanceira.DESPESA}>Despesa</option>
          </select>
        </div>
        <div className="campo">
          <label>Status</label>
          <select className="input" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="aberto">Em aberto</option>
            <option value="liquidado">Liquidado</option>
          </select>
        </div>
        <div className="campo">
          <label>Projeto (lote)</label>
          <select className="input" value={filtroLoteId} onChange={(e) => setFiltroLoteId(e.target.value)}>
            <option value="">Todos</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.identificacao}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {!lancamentos && !erro && <p>Carregando...</p>}

      {lancamentos && lancamentos.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>Nenhum lançamento encontrado.</p>
        </div>
      )}

      {lancamentos && lancamentos.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Conta</th>
                <th>Projeto</th>
                <th>Contato</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.map((l) => (
                <tr key={l.id}>
                  <td data-label="Vencimento">
                    {brData(l.dataVencimento)}
                    {l.totalParcelas > 1 && ` (${l.numeroParcela}/${l.totalParcelas})`}
                  </td>
                  <td data-label="Conta">{l.conta.nome}</td>
                  <td data-label="Projeto">{l.lote?.identificacao ?? 'Geral'}</td>
                  <td data-label="Contato">{l.contato?.nome ?? '—'}</td>
                  <td data-label="Valor">{brl(Number(l.valorParcela))}</td>
                  <td data-label="Status">
                    <strong style={{ color: CORES_STATUS[l.status] }}>
                      {LABEL_STATUS_LANCAMENTO[l.status]}
                    </strong>
                  </td>
                  <td data-label="">
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      {l.status !== StatusLancamento.LIQUIDADO && (
                        <button
                          className="btn-secundario"
                          onClick={() => abrirLiquidar(l)}
                          disabled={!podeEditarFinanceiro}
                        >
                          Liquidar
                        </button>
                      )}
                      <button
                        className="btn-perigo"
                        onClick={() => setParaExcluir(l)}
                        disabled={!podeEditarFinanceiro}
                      >
                        Excluir
                      </button>
                    </div>
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
            <h3>Novo lançamento</h3>

            <div className="campo">
              <label>Natureza</label>
              <select
                className="input"
                value={natureza}
                onChange={(e) => {
                  setNatureza(e.target.value as NaturezaFinanceira);
                  setForm({ ...form, contaId: '' });
                }}
              >
                <option value={NaturezaFinanceira.DESPESA}>{LABEL_NATUREZA_FINANCEIRA.DESPESA}</option>
                <option value={NaturezaFinanceira.RECEITA}>{LABEL_NATUREZA_FINANCEIRA.RECEITA}</option>
              </select>
            </div>

            <div className="linha-campos">
              <div className="campo">
                <label>Conta</label>
                <select
                  className="input"
                  value={form.contaId}
                  onChange={(e) => setForm({ ...form, contaId: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {contasDaNatureza.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.grupoNome} — {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label>Valor total (R$)</label>
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
                <label>Data do documento</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={form.dataDocumento}
                  onChange={(e) => setForm({ ...form, dataDocumento: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Data de vencimento</label>
                <input
                  className="input"
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => setForm({ ...form, dataVencimento: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Nº de parcelas</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.totalParcelas ?? 1}
                  onChange={(e) => setForm({ ...form, totalParcelas: Number(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="linha-campos">
              {campoAtivo('lancamentos.loteId') && (
                <div className="campo">
                  <label>Projeto (lote)</label>
                  <select
                    className="input"
                    value={form.loteId ?? ''}
                    onChange={(e) => setForm({ ...form, loteId: e.target.value || undefined })}
                  >
                    <option value="">Geral (sem projeto)</option>
                    {lotes.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.identificacao}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {campoAtivo('lancamentos.contatoId') && (
                <div className="campo">
                  <label>Contato</label>
                  <select
                    className="input"
                    value={form.contatoId ?? ''}
                    onChange={(e) => setForm({ ...form, contatoId: e.target.value || undefined })}
                  >
                    <option value="">Nenhum</option>
                    {contatos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="linha-campos">
              {campoAtivo('lancamentos.contaBancariaId') && (
                <div className="campo">
                  <label>Banco</label>
                  <select
                    className="input"
                    value={form.contaBancariaId ?? ''}
                    onChange={(e) => setForm({ ...form, contaBancariaId: e.target.value || undefined })}
                  >
                    <option value="">Nenhum</option>
                    {bancos.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {campoAtivo('lancamentos.formaPagamento') && (
                <div className="campo">
                  <label>Forma de pagamento</label>
                  <select
                    className="input"
                    value={form.formaPagamento ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, formaPagamento: (e.target.value as FormaPagamento) || undefined })
                    }
                  >
                    <option value="">Não informado</option>
                    {Object.values(FormaPagamento).map((f) => (
                      <option key={f} value={f}>
                        {LABEL_FORMA_PAGAMENTO[f]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {campoAtivo('lancamentos.descricao') && (
              <div className="campo">
                <label>Descrição (opcional)</label>
                <input
                  className="input"
                  value={form.descricao ?? ''}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
            )}

            {campoAtivo('lancamentos.documento') && (
              <div className="campo">
                <label>Documento (nº, opcional)</label>
                <input
                  className="input"
                  value={form.documento ?? ''}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
                />
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button className="btn" onClick={salvar} disabled={salvando || !form.contaId || !form.valorTotal}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {liquidando && (
        <div className="modal-overlay" onClick={() => setLiquidando(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Liquidar lançamento</h3>
            <div className="campo">
              <label>Data de liquidação</label>
              <input
                className="input"
                type="date"
                max={hojeISO()}
                value={dataLiquidacao}
                onChange={(e) => setDataLiquidacao(e.target.value)}
              />
            </div>
            <div className="campo">
              <label>Banco (opcional)</label>
              <select className="input" value={bancoLiquidacao} onChange={(e) => setBancoLiquidacao(e.target.value)}>
                <option value="">Nenhum</option>
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setLiquidando(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={confirmarLiquidar}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Excluir lançamento?"
          mensagem={`O lançamento de ${brl(Number(paraExcluir.valorParcela))} em "${paraExcluir.conta.nome}" será removido. Esta ação não pode ser desfeita.`}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
