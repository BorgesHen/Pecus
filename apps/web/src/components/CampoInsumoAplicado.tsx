'use client';

import { converterUnidade, formatarQuantidade } from '@pecus/shared';
import { brlOuTraco, brlUnitario } from '@/lib/formato';
import type { InsumoComSaldo } from '@/lib/insumos';

/**
 * Campo de insumo aplicado num manejo — usado na tela de Sanidade e na ficha do
 * animal.
 *
 * O que ele resolve: o produtor compra remédio em litro e aplica em mililitro.
 * Aqui ele escolhe o produto, digita 5, escolhe "ml", e vê **antes de salvar**
 * quanto sai do estoque e quanto aquilo custa. Sem essa prévia, o saldo muda de
 * um jeito que não bate com o número digitado e parece bug.
 *
 * Ficou em componente porque a mesma prévia é necessária nas duas telas, e
 * duplicar a conversão em duas cópias é o caminho mais curto pra elas
 * divergirem.
 */

export interface ValorInsumoAplicado {
  insumoId: string;
  /** Quantidade digitada, na unidade escolhida. */
  quantidade: number | '';
  unidade: string;
}

export function CampoInsumoAplicado({
  insumos,
  valor,
  onChange,
  /** Quantas cabeças recebem a dose. > 1 = aplicação em massa (o estoque baixa dose × cabeças). */
  cabecas = 1,
}: {
  insumos: InsumoComSaldo[];
  valor: ValorInsumoAplicado;
  onChange: (valor: ValorInsumoAplicado) => void;
  cabecas?: number;
}) {
  // Sem insumo cadastrado (ou sem o módulo Estoque, caso em que a lista vem
  // vazia) o campo não aparece: o manejo continua podendo ser registrado.
  if (insumos.length === 0) return null;

  const escolhido = insumos.find((i) => i.id === valor.insumoId) ?? null;
  const emMassa = cabecas > 1;

  const previa = (() => {
    if (!escolhido || valor.quantidade === '' || Number(valor.quantidade) <= 0) return null;
    const unidade = valor.unidade || escolhido.unidade;
    const dose = converterUnidade(Number(valor.quantidade), unidade, escolhido.unidade);
    if (dose == null) {
      return { ok: false as const, erro: `Não é possível converter ${unidade} para ${escolhido.unidade}.` };
    }
    const total = dose * Math.max(1, cabecas);
    const centavos = (v: number) => Math.round(v * 100) / 100;
    return {
      ok: true as const,
      total,
      custoPorAnimal: escolhido.custoUnitario == null ? null : centavos(escolhido.custoUnitario * dose),
      custoTotal: escolhido.custoUnitario == null ? null : centavos(escolhido.custoUnitario * total),
      saldoDepois: escolhido.saldoAtual - total,
      semCusto: escolhido.custoUnitario == null,
    };
  })();

  return (
    <>
      <div className="campo">
        <label>Insumo aplicado (opcional)</label>
        <select
          className="input"
          value={valor.insumoId}
          onChange={(e) => {
            const insumo = insumos.find((i) => i.id === e.target.value);
            // A unidade acompanha o produto escolhido: trocar de insumo sem
            // trocar a unidade lançaria "ml de ração".
            onChange({ insumoId: e.target.value, quantidade: '', unidade: insumo?.unidade ?? '' });
          }}
        >
          <option value="">Nenhum (só registrar o manejo)</option>
          {insumos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome} — saldo {formatarQuantidade(i.saldoAtual, i.unidade)}
            </option>
          ))}
        </select>
      </div>

      {escolhido && (
        <>
          <div className="linha-campos">
            <div className="campo">
              <label>{emMassa ? 'Dose por animal' : 'Quantidade aplicada'}</label>
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                value={valor.quantidade}
                onChange={(e) =>
                  onChange({ ...valor, quantidade: e.target.value === '' ? '' : Number(e.target.value) })
                }
              />
            </div>
            <div className="campo">
              <label>Unidade</label>
              {/* Seletor só quando há pra onde converter: insumo em "saco" não
                  tem fator pra kg (varia de 20 a 60). */}
              {escolhido.unidadesAceitas.length > 1 ? (
                <select
                  className="input"
                  value={valor.unidade}
                  onChange={(e) => onChange({ ...valor, unidade: e.target.value })}
                >
                  {escolhido.unidadesAceitas.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="input" value={escolhido.unidade} disabled />
              )}
            </div>
          </div>

          <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginBottom: 12 }}>
            Custo médio do insumo:{' '}
            <strong>
              {escolhido.custoUnitario != null
                ? brlUnitario(escolhido.custoUnitario, escolhido.unidade)
                : 'não informado'}
            </strong>
            {previa && !previa.ok && (
              <>
                <br />
                <span style={{ color: 'var(--erro)' }}>{previa.erro}</span>
              </>
            )}
            {previa?.ok && (
              <>
                <br />
                Sai do estoque: <strong>{formatarQuantidade(previa.total, escolhido.unidade)}</strong>
                {emMassa && ` (${cabecas} animais)`}
                {' · '}saldo fica {formatarQuantidade(previa.saldoDepois, escolhido.unidade)}
                {previa.saldoDepois < 0 && ' ⚠ negativo'}
                <br />
                Custo: <strong>{brlOuTraco(previa.custoTotal)}</strong>
                {emMassa && <> ({brlOuTraco(previa.custoPorAnimal)} por animal)</>}
                {previa.semCusto &&
                  ' — este insumo não tem valor de compra registrado, então o custo fica em branco.'}
              </>
            )}
          </p>
        </>
      )}
    </>
  );
}
