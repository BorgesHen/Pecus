'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  EntidadeAtividade,
  ModuloSistema,
  TIPOS_METODO_A_PASTO,
  EspecieAnimal,
  calcularCompraLote,
  temDadosDeCompra,
  LABEL_ESPECIE_ANIMAL,
  RECURSO_OVINOS,
  type MetodoManejo,
} from '@pecus/shared';
import {
  listarLotes,
  criarLote,
  removerLote,
  listarMetodosManejo,
  type LoteComContagem,
  type NovoLote,
} from '@/lib/lotes';
import { listarAreas, type AreaComContagem } from '@/lib/areas';
import { BotaoHistorico } from '@/components/BotaoHistorico';
import { usePermissoes } from '@/contexts/PermissoesContext';
import { useToast } from '@/contexts/ToastContext';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';
import { SimuladorCompra, type DadosCompraSimulada } from '@/components/SimuladorCompra';
import { brData, hojeISO } from '@/lib/data';

const FORM_VAZIO: NovoLote = {
  identificacao: '',
  especie: EspecieAnimal.BOVINO,
  dataAquisicao: hojeISO(),
  quantidadeAnimais: 1,
  pesoMedioEntrada: undefined,
  metodoManejoId: undefined,
  areaId: undefined,
  rendimentoCarcaca: undefined,
  gmdEsperado: undefined,
};

/**
 * O que a exclusão de um lote realmente faz.
 *
 * O aviso anterior dizia que "pesagens e gastos também serão removidos". Só a
 * primeira metade era verdade: `Pesagem` e o histórico de método são cascata, mas
 * animal, lançamento financeiro e baixa de estoque apenas **perdem o vínculo** —
 * continuam existindo, sem lote. E os animais nem eram mencionados, embora sejam
 * o que mais dói perder de vista.
 *
 * Um aviso que promete apagar o que não apaga é pior que nenhum aviso: quem
 * confia nele deixa dado órfão sem saber.
 */
function mensagemDeExclusao(lote: LoteComContagem): string {
  const removidos = lote._count.pesagens > 0 ? `As ${lote._count.pesagens} pesagens do lote serão apagadas.` : '';

  const orfaos = [
    lote._count.animais > 0 ? `${lote._count.animais} animal(is)` : null,
    lote._count.lancamentos > 0 ? `${lote._count.lancamentos} lançamento(s) financeiro(s)` : null,
  ].filter(Boolean);

  const semVinculo = orfaos.length
    ? ` ${orfaos.join(' e ')} continuam cadastrados, mas ficam sem lote — o custo por cabeça deles deixa de ser calculado.`
    : '';

  return `"${lote.identificacao}" será excluído. ${removidos}${semVinculo} Esta ação não pode ser desfeita.`.replace(
    /\s+/g,
    ' ',
  );
}

export default function LotesPage() {
  const router = useRouter();
  const toast = useToast();
  const { podeEditar, campoAtivo, temRecurso } = usePermissoes();
  const podeEditarLotes = podeEditar(ModuloSistema.LOTES);
  // Fazenda que só cria gado nem vê o seletor de espécie — a tela fica igual à de antes.
  const temOvinos = temRecurso(RECURSO_OVINOS);
  const [lotes, setLotes] = useState<LoteComContagem[] | null>(null);
  const [metodos, setMetodos] = useState<MetodoManejo[]>([]);
  const [areas, setAreas] = useState<AreaComContagem[]>([]);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovoLote>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<LoteComContagem | null>(null);
  const [simuladorAberto, setSimuladorAberto] = useState(false);

  function carregar() {
    listarLotes()
      .then(setLotes)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar lotes'));
  }

  useEffect(() => {
    carregar();
    listarMetodosManejo().then(setMetodos).catch(() => {});
    listarAreas().then(setAreas).catch(() => {});
  }, []);

  function abrirModal() {
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  /**
   * O simulador roda antes do cadastro: primeiro se decide se a compra vale a
   * pena, e só então o lote nasce já com o custo dentro. Reabrir a partir do
   * cadastro fecha o modal do lote pra não empilhar dois — o formulário
   * preenchido continua no estado.
   */
  function abrirSimulador() {
    setModalAberto(false);
    setSimuladorAberto(true);
  }

  function aplicarCompra(dados: DadosCompraSimulada) {
    setForm((f) => ({
      ...f,
      quantidadeAnimais: dados.quantidadeAnimais,
      pesoMedioCompra: dados.pesoMedioCompra,
      valorKgCompra: dados.valorKgCompra,
      fretePorCabeca: dados.fretePorCabeca,
      comissaoPorCabeca: dados.comissaoPorCabeca,
      // Na planilha do produtor o peso de entrada na pastagem começa igual ao
      // peso de compra; deixa preenchido e ele ajusta na pesagem se precisar.
      pesoMedioEntrada: f.pesoMedioEntrada ?? dados.pesoMedioCompra,
    }));
    setSimuladorAberto(false);
    setModalAberto(true);
  }

  function limparCompra() {
    setForm((f) => ({
      ...f,
      pesoMedioCompra: undefined,
      valorKgCompra: undefined,
      fretePorCabeca: undefined,
      comissaoPorCabeca: undefined,
    }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      await criarLote(form);
      setModalAberto(false);
      toast.sucesso(`Lote "${form.identificacao}" cadastrado com ${form.quantidadeAnimais} animal(is).`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao salvar lote');
    } finally {
      setSalvando(false);
    }
  }

  function pedirExclusao(lote: LoteComContagem, e: React.MouseEvent) {
    e.stopPropagation();
    setParaExcluir(lote);
  }

  async function confirmarExclusao() {
    if (!paraExcluir) return;
    const identificacao = paraExcluir.identificacao;
    try {
      await removerLote(paraExcluir.id);
      toast.sucesso(`Lote "${identificacao}" excluído.`);
      carregar();
    } catch (e) {
      toast.erroDe(e, 'Erro ao excluir lote');
    } finally {
      setParaExcluir(null);
    }
  }

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const resumoCompraForm = calcularCompraLote({
    pesoMedioCompra: form.pesoMedioCompra ?? 0,
    valorKgCompra: form.valorKgCompra ?? 0,
    fretePorCabeca: form.fretePorCabeca ?? 0,
    comissaoPorCabeca: form.comissaoPorCabeca ?? 0,
    quantidadeAnimais: form.quantidadeAnimais,
  });

  const metodoSelecionado = metodos.find((m) => m.id === form.metodoManejoId);
  const usaPasto = metodoSelecionado ? TIPOS_METODO_A_PASTO.includes(metodoSelecionado.tipo) : false;

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Lotes</h2>
        <div className="acoes-celula">
          <BotaoHistorico entidade={EntidadeAtividade.LOTE} />
          <button className="btn-secundario" onClick={abrirSimulador} disabled={!podeEditarLotes}>
            Simular compra
          </button>
          <button className="btn" onClick={abrirModal} disabled={!podeEditarLotes}>
            + Novo lote
          </button>
        </div>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {!lotes && !erro && <p>Carregando...</p>}

      {lotes && lotes.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Nenhum lote cadastrado ainda. Comece criando o primeiro.
          </p>
        </div>
      )}

      {lotes && lotes.length > 0 && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Identificação</th>
                {temOvinos && <th>Espécie</th>}
                <th>Aquisição</th>
                <th>Animais</th>
                <th>Peso entrada</th>
                <th>Método</th>
                <th>Pesagens</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((lote) => (
                <tr
                  key={lote.id}
                  className="linha-clicavel"
                  onClick={() => router.push(`/lotes/${lote.id}`)}
                >
                  <td data-label="Identificação">
                    <strong>{lote.identificacao}</strong>
                  </td>
                  {temOvinos && (
                    <td data-label="Espécie">{LABEL_ESPECIE_ANIMAL[lote.especie]}</td>
                  )}
                  <td data-label="Aquisição">{brData(lote.dataAquisicao)}</td>
                  <td data-label="Animais">{lote.quantidadeAnimais}</td>
                  <td data-label="Peso entrada">
                    {lote.pesoMedioEntrada ? `${lote.pesoMedioEntrada} kg` : '—'}
                  </td>
                  <td data-label="Método">{lote.metodoManejo?.nome ?? '—'}</td>
                  <td data-label="Pesagens">{lote._count.pesagens}</td>
                  <td data-label="">
                    <button
                      className="btn-perigo"
                      onClick={(e) => pedirExclusao(lote, e)}
                      disabled={!podeEditarLotes}
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

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Novo lote</h3>

            {/* Resumo do que veio do simulador — sem ele o custo da compra
                ficaria salvo sem aparecer em lugar nenhum no cadastro. */}
            {temDadosDeCompra(form) ? (
              <div className="simulador-resultado" style={{ marginTop: 0 }}>
                <div className="compra-resumo">
                  <div className="compra-resumo-item">
                    <span>Custo por cabeça</span>
                    <strong>{brl(resumoCompraForm.custoPorCabeca)}</strong>
                  </div>
                  <div className="compra-resumo-item">
                    <span>Total do lote</span>
                    <strong>{brl(resumoCompraForm.custoTotal)}</strong>
                  </div>
                  <div className="compra-resumo-item">
                    <span>Custo real por kg</span>
                    <strong>{brl(resumoCompraForm.custoRealPorKg)}</strong>
                  </div>
                </div>
                <div className="acoes-celula">
                  <button className="btn-secundario" onClick={abrirSimulador}>
                    Recalcular
                  </button>
                  <button className="btn-perigo" onClick={limparCompra}>
                    Remover custo da compra
                  </button>
                </div>
              </div>
            ) : (
              <p className="simulador-dica" style={{ marginBottom: 16 }}>
                Sem custo de compra registrado.{' '}
                <button
                  type="button"
                  className="link-botao"
                  onClick={abrirSimulador}
                >
                  Simular a compra
                </button>{' '}
                pra o lote nascer com o custo por cabeça.
              </p>
            )}

            <div className="campo">
              <label>Identificação</label>
              <input
                className="input"
                value={form.identificacao}
                onChange={(e) => setForm({ ...form, identificacao: e.target.value })}
              />
            </div>

            {temOvinos && (
              <div className="campo">
                <label>Espécie</label>
                <select
                  className="input"
                  value={form.especie ?? EspecieAnimal.BOVINO}
                  onChange={(e) => setForm({ ...form, especie: e.target.value as EspecieAnimal })}
                >
                  {Object.values(EspecieAnimal).map((especie) => (
                    <option key={especie} value={especie}>
                      {LABEL_ESPECIE_ANIMAL[especie]}
                    </option>
                  ))}
                </select>
                <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 6 }}>
                  Define as categorias dos animais e como o custo é calculado (arroba pra bovino,
                  kg de carcaça pra ovino). Não muda depois que o lote tiver animais.
                </p>
              </div>
            )}

            <div className="linha-campos">
              <div className="campo">
                <label>Data de aquisição</label>
                <input
                  className="input"
                  type="date"
                  max={hojeISO()}
                  value={form.dataAquisicao}
                  onChange={(e) => setForm({ ...form, dataAquisicao: e.target.value })}
                />
              </div>
              <div className="campo">
                <label>Quantidade de animais</label>
                <input
                  className="input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.quantidadeAnimais === 0 ? '' : form.quantidadeAnimais}
                  onChange={(e) => {
                    const digitos = e.target.value.replace(/\D/g, '');
                    const numero = digitos ? Math.min(Number(digitos), 100000) : 0;
                    setForm({ ...form, quantidadeAnimais: numero });
                  }}
                />
              </div>
            </div>

            <div className="linha-campos">
              {campoAtivo('lotes.pesoMedioEntrada') && (
                <div className="campo">
                  <label>Peso médio de entrada (kg)</label>
                  <input
                    className="input"
                    type="number"
                    value={form.pesoMedioEntrada ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pesoMedioEntrada: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              )}
              {campoAtivo('lotes.metodoManejoId') && (
                <div className="campo">
                  <label>Método de manejo</label>
                  <select
                    className="input"
                    value={form.metodoManejoId ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, metodoManejoId: e.target.value || undefined })
                    }
                  >
                    <option value="">Não definido</option>
                    {metodos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="linha-campos">
              {campoAtivo('lotes.rendimentoCarcaca') && (
                <div className="campo">
                  <label>Rendimento de carcaça (%)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="52 (padrão)"
                    value={form.rendimentoCarcaca ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        rendimentoCarcaca: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              )}
              {campoAtivo('lotes.gmdEsperado') && (
                <div className="campo">
                  <label>GMD esperado (kg/dia)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    value={form.gmdEsperado ?? ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        gmdEsperado: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {usaPasto && campoAtivo('lotes.areaId') && (
              <div className="campo">
                <label>Área</label>
                <select
                  className="input"
                  value={form.areaId ?? ''}
                  onChange={(e) => setForm({ ...form, areaId: e.target.value || undefined })}
                >
                  <option value="">Não definida</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
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

      {simuladorAberto && (
        <SimuladorCompra
          valoresIniciais={{
            quantidadeAnimais: form.quantidadeAnimais,
            pesoMedioCompra: form.pesoMedioCompra ?? undefined,
            valorKgCompra: form.valorKgCompra ?? undefined,
            fretePorCabeca: form.fretePorCabeca ?? undefined,
            comissaoPorCabeca: form.comissaoPorCabeca ?? undefined,
          }}
          onConfirmar={aplicarCompra}
          onCancelar={() => setSimuladorAberto(false)}
        />
      )}

      {paraExcluir && (
        <PopupConfirmacao
          titulo="Excluir lote?"
          mensagem={mensagemDeExclusao(paraExcluir)}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
