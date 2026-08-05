'use client';

import { useEffect, useState } from 'react';
import {
  EntidadeAtividade,
  ModuloSistema,
  UNIDADES_SUGERIDAS,
  converterUnidade,
  formatarQuantidade,
} from '@pecus/shared';
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
import { brlOuTraco, brlUnitario } from '@/lib/formato';

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
    // Começa na unidade de cadastro: é a que o produtor usa na maioria dos
    // lançamentos. Trocar pra ml só vale a pena quando é dose de remédio.
    setUnidadeLancada(insumo.unidade);
    setValorPago('');
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
                        <span title="Nenhuma entrada com valor informado — lance a compra como Gasto, ou informe o valor na entrada manual.">
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
