'use client';

import { useState } from 'react';
import { KG_POR_ARROBA, calcularAbateAnimal, type EspecieAnimal } from '@pecus/shared';
import { brData, hojeISO } from '@/lib/data';
import { brl } from '@/lib/formato';
import { registrarAbate, removerAbate, type AbateDoAnimal as Abate } from '@/lib/animais';
import { PopupConfirmacao } from './PopupConfirmacao';
import { useToast } from '@/contexts/ToastContext';

/**
 * Abate do animal — a etapa que a saída **abre**, e não fecha.
 *
 * O produtor vende o animal e a nota do frigorífico chega dias depois. Se a ficha
 * do animal se encerrasse na saída, esse último dado ficaria sem lugar; então
 * quando o animal sai sem carcaça informada, o card aparece em estado pendente,
 * dizendo o que falta. É o oposto de esconder: o trabalho que sobrou fica à vista.
 *
 * O formulário pede o **peso de carcaça em kg** (o que a nota traz) e mostra o
 * rendimento calculado. Aceita também digitar o rendimento em %, convertendo pra
 * kg antes de enviar — conveniência de entrada, mas só o kg é gravado, pra não
 * existirem dois lugares dizendo a mesma coisa.
 */
export function AbateDoAnimal({
  animalId,
  especie,
  dataSaida,
  pesoSaida,
  abate,
  podeEditar,
  onMudou,
}: {
  animalId: string;
  especie: EspecieAnimal;
  dataSaida: string | null;
  /** Último peso na fazenda — a referência de reserva do rendimento. */
  pesoSaida: number | null;
  abate: Abate;
  podeEditar: boolean;
  onMudou: () => void;
}) {
  const toast = useToast();
  const [modalAberto, setModalAberto] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    pesoCarcaca: '' as number | '',
    pesoVivoAbate: '' as number | '',
    dataAbate: '',
    observacaoAbate: '',
    /** Modo de entrada: por kg de carcaça (o normal) ou pelo % que o comprador informou. */
    porRendimento: false,
    rendimento: '' as number | '',
    /** Valor recebido: total, ou R$/@ que a tela converte. */
    valorRecebido: '' as number | '',
    porArroba: true,
    valorArroba: '' as number | '',
  });

  // O animal ainda está no rebanho: não há abate a informar.
  if (!abate.podeInformar) return null;

  function abrirModal() {
    setForm({
      pesoCarcaca: abate.pesoCarcaca ?? '',
      pesoVivoAbate: abate.origemPesoVivo === 'frigorifico' ? (abate.pesoVivo ?? '') : '',
      dataAbate: abate.dataAbate ?? dataSaida?.slice(0, 10) ?? hojeISO(),
      observacaoAbate: abate.observacaoAbate ?? '',
      porRendimento: false,
      rendimento: '',
      valorRecebido: abate.valorRecebido ?? '',
      // Abre no modo R$/@ porque é o que a nota do frigorífico traz.
      porArroba: abate.valorRecebido == null,
      valorArroba: abate.valorPorArroba ?? '',
    });
    setModalAberto(true);
  }

  /** Peso vivo que a prévia usa: o do frigorífico se digitado, senão o de saída. */
  const pesoVivoDaPrevia =
    form.pesoVivoAbate !== '' && Number(form.pesoVivoAbate) > 0 ? Number(form.pesoVivoAbate) : pesoSaida;

  /** kg de carcaça a enviar — direto, ou derivado do % quando o modo é por rendimento. */
  const carcacaParaEnviar =
    form.porRendimento && form.rendimento !== '' && pesoVivoDaPrevia
      ? Math.round(((Number(form.rendimento) / 100) * pesoVivoDaPrevia) * 100) / 100
      : form.pesoCarcaca === ''
        ? null
        : Number(form.pesoCarcaca);

  /** Arrobas da prévia — base da conversão de R$/@ pra total. */
  const previaArrobas =
    carcacaParaEnviar != null && carcacaParaEnviar > 0 ? carcacaParaEnviar / KG_POR_ARROBA : null;

  /**
   * Valor total recebido a enviar. No modo R$/@ multiplica pelas arrobas — o que
   * fica gravado é sempre o total, porque é ele que entra no caixa; o R$/@ é razão
   * derivada.
   */
  const valorParaEnviar = (() => {
    if (!form.porArroba) return form.valorRecebido === '' ? null : Number(form.valorRecebido);
    if (form.valorArroba === '' || !previaArrobas) return null;
    return Math.round(Number(form.valorArroba) * previaArrobas * 100) / 100;
  })();

  // Mesma função do servidor, então a prévia e o resultado gravado não divergem.
  const previa =
    carcacaParaEnviar != null && carcacaParaEnviar > 0
      ? calcularAbateAnimal({
          pesoCarcaca: carcacaParaEnviar,
          pesoVivoAbate: form.pesoVivoAbate === '' ? null : Number(form.pesoVivoAbate),
          pesoSaida,
          especie,
        })
      : null;

  async function salvar() {
    if (carcacaParaEnviar == null || carcacaParaEnviar <= 0) return;
    setSalvando(true);
    try {
      const resultado = await registrarAbate(animalId, {
        pesoCarcaca: carcacaParaEnviar,
        dataAbate: form.dataAbate,
        pesoVivoAbate: form.pesoVivoAbate === '' ? undefined : Number(form.pesoVivoAbate),
        observacaoAbate: form.observacaoAbate.trim() || undefined,
        valorRecebido: valorParaEnviar ?? undefined,
      });
      setModalAberto(false);
      toast.sucesso(
        `Abate registrado: ${resultado.pesoCarcaca} kg de carcaça` +
          (resultado.rendimento != null ? `, rendimento ${resultado.rendimento}%` : '') +
          (valorParaEnviar != null
            ? `. Receita de ${brl(valorParaEnviar)} lançada em contas a receber.`
            : '.'),
      );
      // Aviso é alerta, não erro: o registro foi gravado (rendimento fora do
      // usual, ou falta de peso vivo pra calcular).
      if (resultado.aviso) toast.erro(resultado.aviso);
      onMudou();
    } catch (e) {
      toast.erroDe(e, 'Erro ao registrar o abate');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    try {
      await removerAbate(animalId);
      toast.sucesso('Dados de abate removidos.');
      onMudou();
    } catch (e) {
      toast.erroDe(e, 'Erro ao remover os dados de abate');
    } finally {
      setConfirmandoExclusao(false);
    }
  }

  return (
    <>
      <div
        className="card"
        style={{ marginBottom: 24, ...(abate.pendente ? { borderLeft: '3px solid var(--erro)' } : {}) }}
      >
        <div className="topo-tela" style={{ marginBottom: abate.pendente ? 0 : 12 }}>
          <h3 style={{ margin: 0 }}>Abate e rendimento de carcaça</h3>
          <div className="acoes-celula">
            <button className="btn-secundario" onClick={abrirModal} disabled={!podeEditar}>
              {abate.pesoCarcaca != null ? 'Corrigir' : 'Informar carcaça'}
            </button>
            {abate.pesoCarcaca != null && (
              <button
                className="btn-perigo"
                onClick={() => setConfirmandoExclusao(true)}
                disabled={!podeEditar}
              >
                Remover
              </button>
            )}
          </div>
        </div>

        {abate.pendente ? (
          // O estado pendente é o ponto do card: a saída não encerrou o animal,
          // ela abriu esta etapa — e o que falta fica escrito.
          <p style={{ color: 'var(--texto-suave)', fontSize: 14, marginTop: 8, marginBottom: 0 }}>
            Saída registrada em <strong>{brData(dataSaida)}</strong> — falta informar o peso de carcaça da
            nota do frigorífico. Sem ele, este animal não entra no rendimento realizado do lote.
          </p>
        ) : (
          <>
            <div className="grid-cards">
              <div className="card">
                <div className="metrica">{abate.pesoCarcaca} kg</div>
                <div className="metrica-label">Carcaça</div>
              </div>
              <div className="card">
                <div className="metrica">{abate.rendimento != null ? `${abate.rendimento}%` : '—'}</div>
                <div className="metrica-label">
                  Rendimento
                  {abate.pesoVivo != null && (
                    <>
                      {' '}
                      sobre {abate.pesoVivo} kg{' '}
                      {/* Dizer qual peso entrou na conta importa: a diferença
                          entre os dois é a quebra de transporte. */}
                      {abate.origemPesoVivo === 'frigorifico' ? '(frigorífico)' : '(saída da fazenda)'}
                    </>
                  )}
                </div>
              </div>
              {abate.arrobas != null && (
                <div className="card">
                  <div className="metrica">{abate.arrobas} @</div>
                  <div className="metrica-label">Arrobas entregues ({KG_POR_ARROBA} kg/@)</div>
                </div>
              )}
              <div className="card">
                <div className="metrica">{brData(abate.dataAbate)}</div>
                <div className="metrica-label">Data do abate</div>
              </div>
            </div>

            {abate.observacaoAbate && (
              <p style={{ color: 'var(--texto-suave)', fontSize: 14, marginTop: 12, marginBottom: 0 }}>
                {abate.observacaoAbate}
              </p>
            )}
            {abate.aviso && (
              <p style={{ color: 'var(--erro)', fontSize: 13, marginTop: 12, marginBottom: 0 }}>
                {abate.aviso}
              </p>
            )}
          </>
        )}
      </div>

      {modalAberto && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Abate — peso de carcaça</h3>

            <div className="campo">
              <label>O que a nota informa</label>
              <select
                className="input"
                value={form.porRendimento ? 'rendimento' : 'carcaca'}
                onChange={(e) => setForm({ ...form, porRendimento: e.target.value === 'rendimento' })}
              >
                <option value="carcaca">Peso de carcaça em kg</option>
                <option value="rendimento">Só o rendimento em %</option>
              </select>
              <small style={{ color: 'var(--texto-suave)' }}>
                O kg é o que fica gravado. Escolhendo %, o sistema converte usando o peso vivo — então o
                número guardado continua sendo um só.
              </small>
            </div>

            <div className="linha-campos">
              {form.porRendimento ? (
                <div className="campo">
                  <label>Rendimento (%)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={99}
                    step="0.01"
                    value={form.rendimento}
                    onChange={(e) =>
                      setForm({ ...form, rendimento: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                  />
                </div>
              ) : (
                <div className="campo">
                  <label>Peso de carcaça (kg)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    step="0.1"
                    value={form.pesoCarcaca}
                    onChange={(e) =>
                      setForm({ ...form, pesoCarcaca: e.target.value === '' ? '' : Number(e.target.value) })
                    }
                  />
                </div>
              )}
              <div className="campo">
                <label>Data do abate</label>
                <input
                  className="input"
                  type="date"
                  // Não pode ser antes da saída nem no futuro: o animal sai,
                  // embarca e é abatido — nessa ordem.
                  min={dataSaida?.slice(0, 10)}
                  max={hojeISO()}
                  value={form.dataAbate}
                  onChange={(e) => setForm({ ...form, dataAbate: e.target.value })}
                />
              </div>
            </div>

            <div className="campo">
              <label>Peso vivo no frigorífico (opcional)</label>
              <input
                className="input"
                type="number"
                min={1}
                step="0.1"
                value={form.pesoVivoAbate}
                onChange={(e) =>
                  setForm({ ...form, pesoVivoAbate: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
              <small style={{ color: 'var(--texto-suave)' }}>
                {/* Dizer que o sistema NÃO desconta nada é o ponto: a frase antiga
                    ("inclui a quebra de transporte") dava a entender que havia um
                    ajuste automático, e não há — é carcaça ÷ peso, sem estimativa. */}
                {pesoSaida != null ? (
                  <>
                    Sem este campo, o rendimento é calculado sobre o peso de saída da fazenda (
                    {pesoSaida} kg), que foi medido <strong>antes</strong> do transporte e por isso é maior
                    que o da balança do frigorífico. O resultado sai alguns pontos menor que o da nota.
                    <br />
                    O sistema <strong>não aplica desconto de quebra</strong>: a conta é sempre carcaça ÷
                    peso informado, sem estimativa. Para o rendimento bater com a nota, informe aqui o peso
                    vivo que o frigorífico pesou.
                  </>
                ) : (
                  'Este animal não tem peso de saída registrado, então sem este campo o rendimento não pode ser calculado.'
                )}
              </small>
            </div>

            {previa && (
              <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 12 }}>
                Carcaça: <strong>{previa.pesoCarcaca} kg</strong>
                {previa.rendimento != null && (
                  <>
                    {' · '}rendimento <strong>{previa.rendimento}%</strong> sobre {previa.pesoVivo} kg (
                    {previa.origemPesoVivo === 'frigorifico' ? 'frigorífico' : 'saída da fazenda'})
                  </>
                )}
                {previa.arrobas != null && <> {' · '}<strong>{previa.arrobas} @</strong></>}
                {previa.aviso && (
                  <>
                    <br />
                    <span style={{ color: 'var(--erro)' }}>{previa.aviso}</span>
                  </>
                )}
              </p>
            )}

            <div className="campo">
              <label>O que a nota informa sobre o valor</label>
              <select
                className="input"
                value={form.porArroba ? 'arroba' : 'total'}
                onChange={(e) => setForm({ ...form, porArroba: e.target.value === 'arroba' })}
              >
                <option value="arroba">Valor da arroba (R$/@)</option>
                <option value="total">Valor total recebido (R$)</option>
              </select>
            </div>

            <div className="campo">
              <label>{form.porArroba ? 'Valor da arroba (R$/@)' : 'Valor total recebido (R$)'}</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.porArroba ? form.valorArroba : form.valorRecebido}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Number(e.target.value);
                  setForm(form.porArroba ? { ...form, valorArroba: v } : { ...form, valorRecebido: v });
                }}
              />
              <small style={{ color: 'var(--texto-suave)' }}>
                {/* Não liquidado de propósito: o frigorífico paga depois, e marcar
                    como recebido antes mostraria um saldo bancário que não existe. */}
                Informar o valor cria um lançamento de receita <strong>em aberto</strong>, que aparece em
                contas a receber — liquide quando o dinheiro cair. Deixar em branco não gera receita.
                {valorParaEnviar != null && (
                  <>
                    <br />
                    Receita: <strong>{brl(valorParaEnviar)}</strong>
                    {form.porArroba && previaArrobas != null && ` (${previaArrobas.toFixed(2)} @)`}
                  </>
                )}
              </small>
            </div>

            <div className="campo">
              <label>Observação da nota (opcional)</label>
              <input
                className="input"
                placeholder="ex: tipificação, desconto por hematoma"
                value={form.observacaoAbate}
                onChange={(e) => setForm({ ...form, observacaoAbate: e.target.value })}
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={salvar}
                disabled={salvando || carcacaParaEnviar == null || carcacaParaEnviar <= 0 || !form.dataAbate}
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmandoExclusao && (
        <PopupConfirmacao
          titulo="Remover dados de abate?"
          mensagem={`O peso de carcaça de ${abate.pesoCarcaca} kg será apagado e este animal volta a contar como pendente no rendimento do lote.`}
          onConfirmar={excluir}
          onCancelar={() => setConfirmandoExclusao(false)}
        />
      )}
    </>
  );
}
