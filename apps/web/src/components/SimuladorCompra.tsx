'use client';

import { useMemo, useState } from 'react';
import { calcularCompraLote, ratearPorCabeca } from '@pecus/shared';

/** Os quatro valores que o lote guarda — frete e comissão sempre por cabeça. */
export interface DadosCompraSimulada {
  quantidadeAnimais: number;
  pesoMedioCompra: number;
  valorKgCompra: number;
  fretePorCabeca: number;
  comissaoPorCabeca: number;
}

/**
 * Frete e comissão chegam de duas formas na vida real: a nota do caminhão vem
 * pelo total do lote, e a comissão às vezes já vem rateada. Deixar escolher a
 * base evita o produtor dividir na calculadora antes de digitar.
 */
type Base = 'cabeca' | 'total';

interface Props {
  valoresIniciais?: Partial<DadosCompraSimulada>;
  textoConfirmar?: string;
  salvando?: boolean;
  onConfirmar: (dados: DadosCompraSimulada) => void;
  onCancelar: () => void;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const kg = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;

type Numerico = number | '';
const numero = (v: Numerico) => (v === '' ? 0 : Number(v));

export function SimuladorCompra({
  valoresIniciais,
  textoConfirmar = 'Continuar pro cadastro',
  salvando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  const [quantidade, setQuantidade] = useState<Numerico>(valoresIniciais?.quantidadeAnimais ?? '');
  const [peso, setPeso] = useState<Numerico>(valoresIniciais?.pesoMedioCompra ?? '');
  const [valorKg, setValorKg] = useState<Numerico>(valoresIniciais?.valorKgCompra ?? '');
  const [frete, setFrete] = useState<Numerico>(valoresIniciais?.fretePorCabeca ?? '');
  const [baseFrete, setBaseFrete] = useState<Base>('cabeca');
  const [comissao, setComissao] = useState<Numerico>(valoresIniciais?.comissaoPorCabeca ?? '');
  const [baseComissao, setBaseComissao] = useState<Base>('cabeca');

  const cabecas = Math.trunc(numero(quantidade));

  // O que vai pro lote é sempre por cabeça; a base "total" é só conveniência de digitação.
  const fretePorCabeca =
    baseFrete === 'total' ? ratearPorCabeca(numero(frete), cabecas) : numero(frete);
  const comissaoPorCabeca =
    baseComissao === 'total' ? ratearPorCabeca(numero(comissao), cabecas) : numero(comissao);

  const resumo = useMemo(
    () =>
      calcularCompraLote({
        pesoMedioCompra: numero(peso),
        valorKgCompra: numero(valorKg),
        fretePorCabeca,
        comissaoPorCabeca,
        quantidadeAnimais: cabecas,
      }),
    [peso, valorKg, fretePorCabeca, comissaoPorCabeca, cabecas],
  );

  const temBase = numero(peso) > 0 && numero(valorKg) > 0;
  const podeConfirmar = temBase && cabecas >= 1 && !salvando;

  function confirmar() {
    if (!podeConfirmar) return;
    onConfirmar({
      quantidadeAnimais: cabecas,
      pesoMedioCompra: numero(peso),
      valorKgCompra: numero(valorKg),
      fretePorCabeca,
      comissaoPorCabeca,
    });
  }

  function campoValor(
    label: string,
    valor: Numerico,
    setValor: (v: Numerico) => void,
    base: Base,
    setBase: (b: Base) => void,
  ) {
    return (
      <div className="campo">
        <label>{label}</label>
        <div className="simulador-campo-base">
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value === '' ? '' : Number(e.target.value))}
          />
          <select className="input" value={base} onChange={(e) => setBase(e.target.value as Base)}>
            <option value="cabeca">por cabeça</option>
            <option value="total">total do lote</option>
          </select>
        </div>
        {base === 'total' && numero(valor) > 0 && (
          <p className="simulador-dica">
            {cabecas >= 1
              ? `Dividido por ${cabecas} cabeça(s) = ${brl(base === 'total' ? ratearPorCabeca(numero(valor), cabecas) : numero(valor))} por cabeça.`
              : 'Informe a quantidade de cabeças pra ratear.'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Simular compra do lote</h3>
        <p className="simulador-intro">
          A compra é fechada quase às cegas. Preencha o que foi negociado pra ver o custo real por
          cabeça — com frete e comissão dentro — antes de decidir.
        </p>

        <div className="linha-campos">
          <div className="campo">
            <label>Quantidade de cabeças</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={quantidade === '' ? '' : quantidade}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, '');
                setQuantidade(digitos ? Math.min(Number(digitos), 100000) : '');
              }}
            />
          </div>
          <div className="campo">
            <label>Peso médio de compra (kg)</label>
            <input
              className="input"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="0,00"
              value={peso}
              onChange={(e) => setPeso(e.target.value === '' ? '' : Number(e.target.value))}
            />
          </div>
        </div>

        <div className="campo">
          <label>Valor do kg negociado (R$)</label>
          <input
            className="input"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            value={valorKg}
            onChange={(e) => setValorKg(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div className="linha-campos">
          {campoValor('Frete (R$)', frete, setFrete, baseFrete, setBaseFrete)}
          {campoValor('Comissão (R$)', comissao, setComissao, baseComissao, setBaseComissao)}
        </div>

        <div className="simulador-resultado">
          {!temBase ? (
            <p className="simulador-dica">
              Informe o peso médio e o valor do kg pra ver o custo.
            </p>
          ) : (
            <>
              <div className="simulador-destaques">
                <div>
                  <span className="simulador-rotulo">Custo por cabeça</span>
                  <strong className="simulador-numero">{brl(resumo.custoPorCabeca)}</strong>
                </div>
                <div>
                  <span className="simulador-rotulo">
                    Total do lote{cabecas >= 1 ? ` (${cabecas} cabeças)` : ''}
                  </span>
                  <strong className="simulador-numero">
                    {cabecas >= 1 ? brl(resumo.custoTotal) : '—'}
                  </strong>
                </div>
              </div>

              <ul className="simulador-linhas">
                <li>
                  <span>Gado ({kg(numero(peso))} × {brl(numero(valorKg))})</span>
                  <span>{brl(resumo.custoAnimalPorCabeca)}</span>
                </li>
                <li>
                  <span>Frete + comissão por cabeça</span>
                  <span>{brl(resumo.custoAcessorioPorCabeca)}</span>
                </li>
                {cabecas >= 1 && (
                  <li>
                    <span>Peso vivo total do lote</span>
                    <span>{kg(resumo.pesoTotal)}</span>
                  </li>
                )}
              </ul>

              {/* O número que decide o negócio: o kg negociado não é o kg que você paga. */}
              <div className="simulador-alerta">
                Custo real: <strong>{brl(resumo.custoRealPorKg)}/kg</strong> vivo
                {resumo.acrescimoPorKg > 0 && (
                  <>
                    {' '}— frete e comissão somam <strong>{brl(resumo.acrescimoPorKg)}</strong> em
                    cada kg sobre os {brl(numero(valorKg))} negociados.
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-acoes">
          <button className="btn-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="btn" onClick={confirmar} disabled={!podeConfirmar}>
            {salvando ? 'Salvando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
