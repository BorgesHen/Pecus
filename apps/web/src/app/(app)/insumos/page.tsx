'use client';

import { useEffect, useState } from 'react';
import {
  EntidadeAtividade,
  ModuloSistema,
  UNIDADES_SUGERIDAS,
  converterUnidade,
  formatarQuantidade,
  quantidadeLegivel,
} from '@pecus/shared';
import {
  listarInsumos,
  criarInsumo,
  registrarConsumo,
  registrarEntrada,
  listarMovimentosInsumo,
  removerMovimentoInsumo,
  type InsumoComSaldo,
  type NovoInsumo,
} from '@/lib/insumos';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import type { MovimentoInsumo } from '@pecus/shared';
import { brData } from '@/lib/data';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { hojeISO } from '@/lib/data';
import { brlOuTraco, brlUnitario } from '@/lib/formato';

const FORM_VAZIO: NovoInsumo = { nome: '', unidade: 'kg', estoqueMinimo: undefined };

type TipoMovimento = 'ENTRADA' | 'SAIDA';

/** Entrada e consumo usam o mesmo formulário; só muda o rótulo e o endpoint. */
const MOVIMENTO = {
  ENTRADA: {
    titulo: 'Registrar entrada',
    ajuda: 'Use para saldo inicial, ajuste de inventário, produção própria ou devolução. Compra com nota entra sozinha pela tela de Gastos.',
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
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [extrato, setExtrato] = useState<{ insumo: InsumoComSaldo; movimentos: MovimentoInsumo[] } | null>(null);
  const [quantidade, setQuantidade] = useState<number | ''>('');
  const [loteConsumo, setLoteConsumo] = useState('');
  const [unidadeLancada, setUnidadeLancada] = useState('');
  const [valorPago, setValorPago] = useState<number | ''>('');
  const [dataMovimento, setDataMovimento] = useState(hojeISO());
  const [observacao, setObservacao] = useState('');

  function carregar() {
    listarInsumos()
      .then(setInsumos)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar insumos'));
  }

  useEffect(() => {
    carregar();
    // Falha em silêncio: sem o módulo Lotes o seletor de lote não aparece e o
    // consumo continua podendo ser lançado como geral da fazenda.
    listarLotes().then(setLotes).catch(() => setLotes([]));
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

  async function abrirExtrato(insumo: InsumoComSaldo) {
    try {
      setExtrato({ insumo, movimentos: await listarMovimentosInsumo(insumo.id) });
    } catch (e) {
      toast.erroDe(e, 'Erro ao carregar o extrato do insumo');
    }
  }

  async function excluirMovimento(movimentoId: string) {
    if (!extrato) return;
    try {
      await removerMovimentoInsumo(extrato.insumo.id, movimentoId);
      toast.sucesso('Movimento excluído. Saldo e custo médio recalculados.');
      // Recarrega os dois: o saldo/custo do insumo mudou, e o extrato também.
      const [insumos, movimentos] = await Promise.all([
        listarInsumos(),
        listarMovimentosInsumo(extrato.insumo.id),
      ]);
      setInsumos(insumos);
      const atualizado = insumos.find((i) => i.id === extrato.insumo.id);
      setExtrato(atualizado ? { insumo: atualizado, movimentos } : null);
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir o movimento');
    }
  }

  function abrirMovimento(insumo: InsumoComSaldo, tipo: TipoMovimento) {
    setQuantidade('');
    // Começa na unidade de cadastro: é a que o produtor usa na maioria dos
    // lançamentos. Trocar pra ml só vale a pena quando é dose de remédio.
    setUnidadeLancada(insumo.unidade);
    setValorPago('');
    setLoteConsumo('');
    setDataMovimento(hojeISO());
    setObservacao('');
    setMovimento({ insumo, tipo });
  }

  async function salvarMovimento() {
    if (!movimento || quantidade === '') return;
    const { insumo, tipo } = movimento;
    setSalvando(true);
    try {
      const resposta = await MOVIMENTO[tipo].salvar(insumo.id, {
        quantidade: Number(quantidade),
        unidade: unidadeLancada || undefined,
        valorTotal: tipo === 'ENTRADA' && valorPago !== '' ? Number(valorPago) : undefined,
        loteId: tipo === 'SAIDA' && loteConsumo ? loteConsumo : undefined,
        data: dataMovimento,
        observacao: observacao.trim() || undefined,
      });
      setMovimento(null);
      // Frases separadas por causa da concordância: "entrada registrada", "consumo registrado".
      const lancado = `${quantidade} ${unidadeLancada || insumo.unidade}`;
      toast.sucesso(
        tipo === 'ENTRADA'
          ? `Entrada de ${lancado} em "${insumo.nome}" registrada.`
          : `Consumo de ${lancado} em "${insumo.nome}" registrado.`,
      );
      // O aviso vem do servidor (saldo negativo, insumo sem custo) e é alerta, não
      // erro: o lançamento foi gravado.
      const aviso = 'aviso' in resposta ? resposta.aviso : null;
      if (aviso) toast.erro(aviso);
      carregar();
    } catch (e) {
      toast.erroDe(e, `Erro ao registrar ${tipo === 'ENTRADA' ? 'a entrada' : 'o consumo'}`);
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Prévia do que o lançamento vai fazer, montada enquanto se digita.
   *
   * Existe por causa da conversão: quem lança 5 ml de um produto cadastrado em
   * litro precisa ver que isso é 0,005 L antes de salvar, senão o saldo muda de
   * um jeito que não bate com o número digitado e parece bug.
   */
  const previaDoLancamento = (() => {
    if (!movimento || quantidade === '' || Number(quantidade) <= 0) return null;
    const { insumo, tipo } = movimento;
    const naBase = converterUnidade(Number(quantidade), unidadeLancada || insumo.unidade, insumo.unidade);
    if (naBase == null) return null;

    const partes: string[] = [];
    if ((unidadeLancada || insumo.unidade) !== insumo.unidade) {
      partes.push(`= ${formatarQuantidade(naBase, insumo.unidade)} no estoque`);
    }
    if (tipo === 'SAIDA' && insumo.custoUnitario != null) {
      partes.push(`custo ${brlOuTraco(Math.round(insumo.custoUnitario * naBase * 100) / 100)}`);
    }
    const saldo = tipo === 'ENTRADA' ? insumo.saldoAtual + naBase : insumo.saldoAtual - naBase;
    partes.push(`saldo fica ${formatarQuantidade(saldo, insumo.unidade)}`);
    if (saldo < 0) partes.push('⚠ negativo');
    return partes.join(' · ');
  })();

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
        Quando você lança uma despesa vinculada a um insumo (com quantidade), a entrada acontece
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
                <th>Custo médio</th>
                <th>Valor em estoque</th>
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
                      {/* Formatado, não cru: somar e subtrair frações em ponto
                          flutuante produz 1.2890000000000001, e esse número
                          aparecia inteiro na tela. */}
                      {formatarQuantidade(i.saldoAtual, i.unidade)}
                      {abaixoDoMinimo ? ' ⚠' : ''}
                    </td>
                    <td data-label="Custo médio">
                      {i.custoUnitario != null ? (
                        brlUnitario(i.custoUnitario, i.unidade)
                      ) : (
                        <span title="Nenhuma entrada com valor informado — lance a compra em Gastos, ou informe o valor na entrada manual.">
                          —
                        </span>
                      )}
                    </td>
                    <td data-label="Valor em estoque">{brlOuTraco(i.valorEmEstoque)}</td>
                    <td data-label="Estoque mínimo">
                      {i.estoqueMinimo != null ? formatarQuantidade(i.estoqueMinimo, i.unidade) : '—'}
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
                        <button className="btn-secundario" onClick={() => abrirExtrato(i)}>
                          Extrato
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
                  list="unidades-sugeridas"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                />
                {/* Sugestão, não restrição: "saco" e "fardo" continuam válidos —
                    só não convertem pra outra unidade. */}
                <datalist id="unidades-sugeridas">
                  {UNIDADES_SUGERIDAS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
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

      {extrato && (
        <div className="modal-overlay" onClick={() => setExtrato(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Extrato — {extrato.insumo.nome}</h3>
            <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 12 }}>
              Saldo: <strong>{formatarQuantidade(extrato.insumo.saldoAtual, extrato.insumo.unidade)}</strong>
              {extrato.insumo.custoUnitario != null && (
                <>
                  {' · '}Custo médio:{' '}
                  <strong>{brlUnitario(extrato.insumo.custoUnitario, extrato.insumo.unidade)}</strong>
                </>
              )}
              <br />
              O custo médio sai das entradas com valor. Um erro de unidade na entrada (1000 lançado em
              L quando eram ml) distorce o saldo e o custo — apague o movimento e lance de novo.
            </p>

            {extrato.movimentos.length === 0 ? (
              <p className="atividade-vazio">Nenhum movimento registrado.</p>
            ) : (
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th>Quantidade</th>
                      <th>Valor</th>
                      <th>Origem</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {extrato.movimentos.map((m) => {
                      const legivel = quantidadeLegivel(m.quantidade, extrato.insumo.unidade);
                      // Movimento de compra pertence ao gasto; de aplicação, ao
                      // evento sanitário. O servidor recusa apagar os dois.
                      const manual = !m.gastoId && !m.loteId;
                      return (
                        <tr key={m.id}>
                          <td data-label="Data">{brData(m.data)}</td>
                          <td data-label="Tipo">{m.tipo === 'ENTRADA' ? 'Entrada' : 'Baixa'}</td>
                          <td data-label="Quantidade">
                            {formatarQuantidade(legivel.quantidade, legivel.unidade)}
                          </td>
                          <td data-label="Valor">{brlOuTraco(m.valorTotal)}</td>
                          <td data-label="Origem">
                            {m.gastoId ? 'Compra (gasto)' : m.observacao || 'Lançamento manual'}
                          </td>
                          <td data-label="">
                            {podeEditarEstoque && !m.gastoId && (
                              <button className="btn-perigo" onClick={() => excluirMovimento(m.id)}>
                                Excluir
                              </button>
                            )}
                            {m.gastoId && (
                              <span style={{ color: 'var(--texto-suave)', fontSize: 12 }}>
                                exclua o gasto
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setExtrato(null)}>
                Fechar
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
                {formatarQuantidade(movimento.insumo.saldoAtual, movimento.insumo.unidade)}
              </strong>
              {movimento.insumo.custoUnitario != null && (
                <>
                  {' · '}Custo médio:{' '}
                  <strong>{brlUnitario(movimento.insumo.custoUnitario, movimento.insumo.unidade)}</strong>
                </>
              )}
            </p>

            <div className="linha-campos">
              <div className="campo">
                <label>Quantidade</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div className="campo">
                <label>Unidade</label>
                {/* Só aparece como seletor quando há mais de uma unidade possível
                    (L aceita ml). Insumo em "saco" não tem pra onde converter. */}
                {movimento.insumo.unidadesAceitas.length > 1 ? (
                  <select
                    className="input"
                    value={unidadeLancada}
                    onChange={(e) => setUnidadeLancada(e.target.value)}
                  >
                    {movimento.insumo.unidadesAceitas.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="input" value={movimento.insumo.unidade} disabled />
                )}
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

            {movimento.tipo === 'SAIDA' && lotes.length > 0 && (
              <div className="campo">
                <label>Lote que consumiu (opcional)</label>
                <select className="input" value={loteConsumo} onChange={(e) => setLoteConsumo(e.target.value)}>
                  <option value="">Consumo geral da fazenda</option>
                  {lotes.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.identificacao}
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--texto-suave)' }}>
                  Escolhendo o lote, o valor desta baixa entra no custo dele e é rateado por cabeça —
                  é assim que a ração comprada pelo estoque vira custo. Sem lote, a baixa acontece mas
                  não entra em custo de lote nenhum.
                </small>
              </div>
            )}

            {movimento.tipo === 'ENTRADA' && (
              <div className="campo">
                <label>Valor pago (opcional)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value ? Number(e.target.value) : '')}
                />
                <small style={{ color: 'var(--texto-suave)' }}>
                  É este valor que forma o custo médio do insumo — e, com ele, o custo do que for
                  aplicado num animal. Sem valor, a entrada só soma quantidade.
                </small>
              </div>
            )}

            {previaDoLancamento && (
              <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 12 }}>
                {previaDoLancamento}
              </p>
            )}

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
