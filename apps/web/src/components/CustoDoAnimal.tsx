'use client';

import { formatarQuantidade, type CustoAnimal } from '@pecus/shared';
import { brl, brlOuTraco, brlValor } from '@/lib/formato';
import { brData } from '@/lib/data';

/**
 * Custo de produção do animal, aberto nas três parcelas.
 *
 * Mostrar as parcelas separadas, e não só o total, é o ponto da tela: compra e
 * rateio são iguais pra todo o lote, então a diferença entre dois animais do
 * mesmo lote está inteira na coluna "direto no animal". É o remédio que um tomou
 * e o outro não.
 *
 * As ressalvas ficam à vista porque um total incompleto que parece completo é
 * pior que nenhum total: lote sem dados de compra, insumo sem valor.
 */
export function CustoDoAnimal({ custo }: { custo: CustoAnimal }) {
  const linhas = [
    {
      rotulo: 'Compra (por cabeça)',
      valor: custo.compra,
      ajuda: 'Peso × valor do kg + frete + comissão, do cadastro de compra do lote.',
    },
    {
      rotulo: 'Rateio dos gastos do lote',
      valor: custo.rateio?.porCabeca ?? null,
      // Abre as duas fontes do rateio: gasto lançado direto no lote e consumo de
      // estoque atribuído a ele. Sem separar, "R$ 0,00 de rateio" não diz se
      // falta lançar gasto ou se falta dar baixa da ração no lote.
      ajuda: custo.rateio
        ? [
            `${brl(custo.rateio.totalRateavel)} ÷ ${custo.rateio.cabecas} cabeça(s).`,
            custo.rateio.totalGastos > 0 ? `Gastos do lote: ${brl(custo.rateio.totalGastos)}.` : null,
            custo.rateio.totalConsumoDeInsumo > 0
              ? `Consumo de estoque no lote: ${brl(custo.rateio.totalConsumoDeInsumo)}.`
              : null,
          ]
            .filter(Boolean)
            .join(' ')
        : undefined,
    },
    {
      rotulo: 'Direto neste animal',
      valor: custo.totalDireto,
      ajuda: 'Insumo aplicado na sanidade, ao custo médio do estoque no dia da aplicação.',
    },
  ];

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="topo-tela" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Custo de produção</h3>
        <strong style={{ fontSize: 20 }}>{brlValor(custo.total)}</strong>
      </div>

      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.rotulo}>
                <td data-label="Parcela">
                  {linha.rotulo}
                  {linha.ajuda && (
                    <>
                      <br />
                      <small style={{ color: 'var(--texto-suave)' }}>{linha.ajuda}</small>
                    </>
                  )}
                </td>
                <td data-label="Valor">{brlOuTraco(linha.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {custo.diretos.length > 0 && (
        <>
          <h4 style={{ marginTop: 20, marginBottom: 8 }}>Lançado neste animal</h4>
          <div className="tabela-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Lançamento</th>
                  <th>Quantidade</th>
                  <th>Custo</th>
                </tr>
              </thead>
              <tbody>
                {custo.diretos.map((direto, indice) => (
                  <tr key={`${direto.data}-${direto.descricao}-${indice}`}>
                    <td data-label="Data">{brData(direto.data)}</td>
                    <td data-label="Lançamento">{direto.descricao}</td>
                    <td data-label="Quantidade">
                      {direto.quantidade != null
                        ? formatarQuantidade(direto.quantidade, direto.unidade ?? undefined)
                        : '—'}
                    </td>
                    <td data-label="Custo">{brlOuTraco(direto.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {custo.ressalvas.length > 0 && (
        <ul style={{ marginTop: 16, paddingLeft: 20, color: 'var(--texto-suave)', fontSize: 13 }}>
          {custo.ressalvas.map((ressalva) => (
            <li key={ressalva}>{ressalva}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
