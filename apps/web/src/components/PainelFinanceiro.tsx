'use client';

import { NaturezaFinanceira } from '@pecus/shared';
import { brl } from '@/lib/formato';
import type { FluxoDeCaixa, Resultado, Saldos } from '@/lib/financeiro';

/**
 * As três leituras que o plano de contas existia para dar: saldo, fluxo e
 * resultado.
 *
 * O que cada uma responde, e por que são três e não uma:
 *
 *   Saldo    → quanto tem hoje no banco (caixa, só liquidado)
 *   Fluxo    → quanto entrou e saiu mês a mês (caixa, só liquidado)
 *   Resultado→ quanto sobrou do que aconteceu no período (competência, inclui a pagar)
 *
 * Uma conta de ração comprada em janeiro e paga em março é custo de janeiro no
 * resultado e saída de março no fluxo. Mostrar as duas coisas com o mesmo rótulo
 * é o erro clássico de controle de fazenda.
 */

const mesLegivel = (mes: string) => {
  const [ano, m] = mes.split('-');
  return `${m}/${ano}`;
};

export function PainelFinanceiro({
  saldos,
  fluxo,
  resultado,
}: {
  saldos: Saldos | null;
  fluxo: FluxoDeCaixa | null;
  resultado: Resultado | null;
}) {
  return (
    <>
      {saldos && saldos.contas.length > 0 && (
        <>
          <h3 style={{ marginBottom: 4 }}>Saldo em conta</h3>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 12, fontSize: 14 }}>
            Saldo inicial mais o que foi <strong>liquidado</strong> em cada conta. Parcela em aberto não
            entra — ela ainda não tirou dinheiro do banco, e somá-la faria o saldo divergir do extrato.
          </p>
          <div className="tabela-wrap" style={{ marginBottom: 8 }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Saldo inicial</th>
                  <th>Recebido</th>
                  <th>Pago</th>
                  <th>Saldo atual</th>
                </tr>
              </thead>
              <tbody>
                {saldos.contas.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Conta">
                      <strong>{c.nome}</strong>
                      {!c.ativo && <span style={{ color: 'var(--texto-suave)' }}> (inativa)</span>}
                    </td>
                    <td data-label="Saldo inicial">{brl(c.saldoInicial)}</td>
                    <td data-label="Recebido">{c.recebido > 0 ? brl(c.recebido) : '—'}</td>
                    <td data-label="Pago">{c.pago > 0 ? brl(c.pago) : '—'}</td>
                    <td data-label="Saldo atual">
                      <strong style={c.saldoAtual < 0 ? { color: 'var(--erro)' } : undefined}>
                        {brl(c.saldoAtual)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: 'var(--texto-suave)', fontSize: 14, marginBottom: 24 }}>
            Total nas contas ativas: <strong>{brl(saldos.saldoTotal)}</strong>
            {saldos.liquidadoSemBanco !== 0 && (
              <>
                {' · '}
                {/* Sem isto, a diferença com o extrato viraria mistério. */}
                <span style={{ color: 'var(--erro)' }}>
                  {brl(Math.abs(saldos.liquidadoSemBanco))} liquidados sem banco informado — não entram em
                  conta nenhuma
                </span>
              </>
            )}
          </p>
        </>
      )}

      {fluxo && fluxo.meses.length > 0 && (
        <>
          <h3 style={{ marginBottom: 4 }}>Fluxo de caixa</h3>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 12, fontSize: 14 }}>
            Só o que foi liquidado, na data em que foi. O acumulado parte do saldo inicial das contas
            ({brl(fluxo.saldoInicialBancos)}).
            {/* O fluxo conta TODO dinheiro que andou; o saldo por conta só conta o
                que foi atribuído a um banco. A diferença é exatamente o liquidado
                sem banco — dizer isso evita a leitura de que um dos dois está errado. */}
            {saldos && saldos.liquidadoSemBanco !== 0 && (
              <>
                {' '}
                O acumulado final ({brl(fluxo.saldoFinal)}) fica{' '}
                {brl(Math.abs(saldos.liquidadoSemBanco))} abaixo do total nas contas porque esse valor foi
                liquidado sem banco informado: aqui ele conta como dinheiro que andou, no saldo por conta
                não entra em conta nenhuma. Informe o banco nesses lançamentos para os dois números
                fecharem.
              </>
            )}
            {saldos && saldos.liquidadoSemBanco === 0 && ' A última linha bate com o saldo atual das contas.'}
          </p>
          <div className="tabela-wrap" style={{ marginBottom: 24 }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Resultado do mês</th>
                  <th>Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {fluxo.meses.map((m) => (
                  <tr key={m.mes}>
                    <td data-label="Mês">{mesLegivel(m.mes)}</td>
                    <td data-label="Entradas">{m.entradas > 0 ? brl(m.entradas) : '—'}</td>
                    <td data-label="Saídas">{m.saidas > 0 ? brl(m.saidas) : '—'}</td>
                    <td data-label="Resultado do mês" style={m.resultado < 0 ? { color: 'var(--erro)' } : undefined}>
                      {brl(m.resultado)}
                    </td>
                    <td data-label="Acumulado">
                      <strong style={m.acumulado < 0 ? { color: 'var(--erro)' } : undefined}>
                        {brl(m.acumulado)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {resultado && resultado.grupos.length > 0 && (
        <>
          <h3 style={{ marginBottom: 4 }}>Resultado por grupo</h3>
          <p style={{ color: 'var(--texto-suave)', marginBottom: 12, fontSize: 14 }}>
            Por <strong>competência</strong>: conta o que aconteceu no período, pago ou não. Diferente do
            fluxo acima, que só conta o dinheiro que andou. O percentual é sobre a receita — é como se lê
            um DRE.
          </p>

          <div className="grid-cards" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="metrica">{brl(resultado.receitaTotal)}</div>
              <div className="metrica-label">Receita</div>
            </div>
            <div className="card">
              <div className="metrica">{brl(resultado.despesaTotal)}</div>
              <div className="metrica-label">Despesa</div>
            </div>
            <div className="card">
              <div className="metrica" style={resultado.resultado < 0 ? { color: 'var(--erro)' } : undefined}>
                {brl(resultado.resultado)}
              </div>
              <div className="metrica-label">
                Resultado{resultado.margem != null && ` · margem ${resultado.margem}%`}
              </div>
            </div>
          </div>

          <div className="tabela-wrap" style={{ marginBottom: 24 }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Grupo / conta</th>
                  <th>Total</th>
                  <th>% da receita</th>
                </tr>
              </thead>
              <tbody>
                {resultado.grupos.map((g) => (
                  <>
                    <tr key={g.grupoId} style={{ fontWeight: 600 }}>
                      <td data-label="Grupo">
                        {g.codigo} {g.nome}
                        <span style={{ color: 'var(--texto-suave)', fontWeight: 400 }}>
                          {' '}
                          ({g.natureza === NaturezaFinanceira.RECEITA ? 'receita' : 'despesa'})
                        </span>
                      </td>
                      <td data-label="Total">{brl(g.total)}</td>
                      <td data-label="% da receita">
                        {g.percentualDaReceita != null ? `${g.percentualDaReceita}%` : '—'}
                      </td>
                    </tr>
                    {/* Contas do grupo indentadas: é onde se vê que "Custos
                        Variáveis" é 80% ração e não uma soma opaca. */}
                    {g.contas.map((c) => (
                      <tr key={c.contaId}>
                        <td data-label="Conta" style={{ paddingLeft: 28, color: 'var(--texto-suave)' }}>
                          {c.codigo} {c.nome}
                        </td>
                        <td data-label="Total">{brl(c.total)}</td>
                        <td data-label="% da receita">
                          {resultado.receitaTotal > 0
                            ? `${Math.round((c.total / resultado.receitaTotal) * 10000) / 100}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
