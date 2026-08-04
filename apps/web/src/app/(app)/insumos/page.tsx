'use client';

import { useEffect, useState } from 'react';
import { EntidadeAtividade, ModuloSistema } from '@pecus/shared';
import {
  listarInsumos,
  criarInsumo,
  registrarConsumo,
  registrarEntrada,
  type InsumoComSaldo,
  type NovoInsumo,
} from '@/lib/insumos';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { hojeISO } from '@/lib/data';

const FORM_VAZIO: NovoInsumo = { nome: '', unidade: 'kg', estoqueMinimo: undefined };

type TipoMovimento = 'ENTRADA' | 'SAIDA';

/** Entrada e consumo usam o mesmo formulário; só muda o rótulo e o endpoint. */
const MOVIMENTO = {
  ENTRADA: {
    titulo: 'Registrar entrada',
    ajuda: 'Use para saldo inicial, ajuste de inventário, produção própria ou devolução. Compra com nota entra sozinha pelo Gasto.',
    exemploObs: 'ex: saldo inicial, ajuste de inventário',
    salvar: registrarEntrada,
  },
  SAIDA: {
    titulo: 'Registrar consumo',
    ajuda: 'Baixa de estoque: o que foi usado no rebanho ou na lavoura.',
    exemploObs: 'ex: trato do Lote 03',
    salvar: registrarConsumo,
  },
} satisfies Record<TipoMovimento, unknown>;

export default function InsumosPage() {
  const toast = useToast();
  const { podeEditar, campoAtivo } = usePermissoes();
  const podeEditarEstoque = podeEditar(ModuloSistema.ESTOQUE);

  const [insumos, setInsumos] = useState<InsumoComSaldo[] | null>(null);
  const [erro, setErro] = useState('');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [form, setForm] = useState<NovoInsumo>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [movimento, setMovimento] = useState<{ insumo: InsumoComSaldo; tipo: TipoMovimento } | null>(
    null,
  );
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [dataMovimento, setDataMovimento] = useState(hojeISO());
  const [observacao, setObservacao] = useState('');

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
    try {
      await criarInsumo(form);
      setModalNovoAberto(false);
      toast.sucesso(`Insumo "${form.nome}" cadastrado.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar insumo');
    } finally {
      setSalvando(false);
    }
  }

  function abrirMovimento(insumo: InsumoComSaldo, tipo: TipoMovimento) {
    setQuantidade('');
    setDataMovimento(hojeISO());
    setObservacao('');
    setMovimento({ insumo, tipo });
  }

  async function salvarMovimento() {
    if (!movimento || quantidade === '') return;
    const { insumo, tipo } = movimento;
    setSalvando(true);
    try {
      await MOVIMENTO[tipo].salvar(insumo.id, {
        quantidade: Number(quantidade),
        data: dataMovimento,
        observacao: observacao.trim() || undefined,
      });
      setMovimento(null);
      // Frases separadas por causa da concordância: "entrada registrada", "consumo registrado".
      toast.sucesso(
        tipo === 'ENTRADA'
          ? `Entrada de ${quantidade} ${insumo.unidade} em "${insumo.nome}" registrada.`
          : `Consumo de ${quantidade} ${insumo.unidade} em "${insumo.nome}" registrado.`,
      );
      carregar();
    } catch (e) {
      toast.erroDe(e, `Erro ao registrar ${tipo === 'ENTRADA' ? 'a entrada' : 'o consumo'}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Estoque de insumos</h2>
        <div className="acoes-celula">
          <BotaoHistorico entidade={EntidadeAtividade.INSUMO} />
          <button className="btn" onClick={abrirModalNovo} disabled={!podeEditarEstoque}>
            + Novo insumo
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--texto-suave)', marginBottom: 16, fontSize: 14 }}>
        Quando você lança um Gasto vinculado a um insumo (com quantidade), a entrada acontece
        automaticamente. Use <strong>Registrar entrada</strong> para o que entra sem passar por um
        gasto — saldo inicial, ajuste de inventário, produção própria — e{' '}
        <strong>Registrar consumo</strong> para dar baixa.
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
                      <div className="acoes-celula">
                        <button
                          className="btn-secundario"
                          onClick={() => abrirMovimento(i, 'ENTRADA')}
                          disabled={!podeEditarEstoque}
                        >
                          Registrar entrada
                        </button>
                        <button
                          className="btn-secundario"
                          onClick={() => abrirMovimento(i, 'SAIDA')}
                          disabled={!podeEditarEstoque}
                        >
                          Registrar consumo
                        </button>
                      </div>
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

      {movimento && (
        <div className="modal-overlay" onClick={() => setMovimento(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {MOVIMENTO[movimento.tipo].titulo} — {movimento.insumo.nome}
            </h3>

            <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 12 }}>
              {MOVIMENTO[movimento.tipo].ajuda}
              <br />
              Saldo atual: <strong>
                {movimento.insumo.saldoAtual} {movimento.insumo.unidade}
              </strong>
            </p>

            <div className="linha-campos">
              <div className="campo">
                <label>Quantidade ({movimento.insumo.unidade})</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div className="campo">
                <label>Data</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={dataMovimento}
                  onChange={(e) => setDataMovimento(e.target.value)}
                />
              </div>
            </div>

            <div className="campo">
              <label>Observação (opcional)</label>
              <input
                className="input"
                placeholder={MOVIMENTO[movimento.tipo].exemploObs}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setMovimento(null)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={salvarMovimento}
                disabled={salvando || quantidade === '' || Number(quantidade) <= 0}
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
