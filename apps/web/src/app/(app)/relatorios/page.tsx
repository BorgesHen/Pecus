'use client';

import { useEffect, useState } from 'react';
import { listarLotes, type LoteComContagem } from '@/lib/lotes';
import { custoPorArroba, type CustoArroba } from '@/lib/relatorios';
import { gastosPorCategoria, type GastoPorCategoria } from '@/lib/gastos';

export default function RelatoriosPage() {
  const [lotes, setLotes] = useState<LoteComContagem[]>([]);
  const [loteId, setLoteId] = useState('');
  const [custo, setCusto] = useState<CustoArroba | null>(null);
  const [categorias, setCategorias] = useState<GastoPorCategoria[] | null>(null);
  const [erro, setErro] = useState('');
  const [erroCusto, setErroCusto] = useState('');

  useEffect(() => {
    listarLotes()
      .then((lista) => {
        setLotes(lista);
        if (lista.length > 0) setLoteId(lista[0].id);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar lotes'));
  }, []);

  useEffect(() => {
    if (!loteId) {
      setCusto(null);
      setCategorias(null);
      setErroCusto('');
      return;
    }
    setErroCusto('');
    custoPorArroba(loteId)
      .then(setCusto)
      .catch((e) => {
        setCusto(null);
        setErroCusto(e instanceof Error ? e.message : 'Erro ao carregar custo por arroba');
      });
    gastosPorCategoria(loteId).then(setCategorias).catch(() => setCategorias(null));
  }, [loteId]);

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const maiorGasto = categorias ? Math.max(1, ...categorias.map((c) => c.total)) : 1;
  /** Indicador de custo que faz sentido pra espécie do lote (arroba pra bovino, kg de carcaça pra ovino). */
  const custoPrincipal = custo ? (custo.vendePorArroba ? custo.custoPorArroba : custo.custoPorKgCarcaca) : null;

  return (
    <div className="container">
      <div className="topo-tela">
        <h2>Relatórios</h2>
      </div>

      {erro && <div className="erro">{erro}</div>}

      {lotes.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--texto-suave)' }}>
            Cadastre um lote com pesagens e gastos para ver os relatórios.
          </p>
        </div>
      ) : (
        <>
          <div className="campo" style={{ maxWidth: 320 }}>
            <label>Lote</label>
            <select className="input" value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.identificacao}
                </option>
              ))}
            </select>
          </div>

          {/* Ovino não se comercializa em arroba, então o indicador principal muda pra kg de carcaça. */}
          <h3 style={{ margin: '24px 0 12px' }}>
            {custo && !custo.vendePorArroba ? 'Custo por kg de carcaça' : 'Custo por arroba'}
          </h3>
          {custo && custoPrincipal != null && (
            <p style={{ color: 'var(--texto-suave)', marginBottom: 12, fontSize: 14 }}>
              {/* Dizer se o rendimento é estimado ou realizado é essencial: um
                  custo por arroba calculado sobre estimativa não se compara a um
                  calculado sobre a carcaça que realmente saiu. */}
              Considera rendimento de carcaça de {custo.rendimentoCarcaca}%
              {custo.origemRendimento === 'realizado' ? (
                <>
                  {' '}
                  <strong>realizado</strong> ({custo.abatidosComCarcaca} de {custo.abatidos} abatidos com
                  carcaça informada)
                </>
              ) : (
                <>
                  {' '}
                  <strong>estimado</strong>
                  {custo.abatidos > 0 &&
                    ' — informe o peso de carcaça dos animais abatidos para este número passar a usar o rendimento real'}
                </>
              )}
              {custo.vendePorArroba
                ? '. Arroba = 15 kg de carcaça, não peso vivo.'
                : '. Ovinos são comercializados por kg de carcaça, não por arroba.'}
              {custo.arrobasEntregues != null && (
                <>
                  <br />
                  Arrobas entregues no abate: <strong>{custo.arrobasEntregues} @</strong> — diferente das
                  arrobas <em>produzidas</em> abaixo, que contam só o ganho de peso do período.
                </>
              )}
            </p>
          )}

          {erroCusto ? (
            <div className="erro">{erroCusto}</div>
          ) : custo?.erro ? (
            <div className="erro">{custo.erro}</div>
          ) : custo && custoPrincipal == null ? (
            <div className="card">
              <p style={{ color: 'var(--texto-suave)' }}>
                Ainda não é possível calcular: registre pelo menos uma pesagem (além do peso de entrada)
                e algum gasto para este lote.
              </p>
            </div>
          ) : custo ? (
            <div className="grid-cards" style={{ marginBottom: 24 }}>
              <div className="card">
                <div className="metrica">{brl(custo.custoTotal)}</div>
                <div className="metrica-label">Custo total</div>
              </div>
              <div className="card">
                <div className="metrica">{custo.ganhoTotalKg.toFixed(1)} kg</div>
                <div className="metrica-label">Ganho total de peso</div>
              </div>
              <div className="card">
                <div className="metrica">
                  {custo.vendePorArroba
                    ? `${custo.ganhoArrobas?.toFixed(2)} @`
                    : `${custo.ganhoCarcacaKg.toFixed(1)} kg`}
                </div>
                <div className="metrica-label">
                  {custo.vendePorArroba ? 'Ganho em arrobas' : 'Ganho em carcaça'}
                </div>
              </div>
              <div className="card" style={{ background: 'var(--verde)', color: '#fff' }}>
                <div className="metrica" style={{ color: '#fff' }}>
                  {brl(custoPrincipal!)}
                </div>
                <div className="metrica-label" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {custo.vendePorArroba ? 'Custo por arroba' : 'Custo por kg de carcaça'}
                </div>
              </div>
            </div>
          ) : (
            <p>Carregando...</p>
          )}

          <h3 style={{ margin: '24px 0 12px' }}>Gastos por categoria (lote selecionado)</h3>
          <div className="card">
            {!categorias || categorias.length === 0 ? (
              <p style={{ color: 'var(--texto-suave)' }}>Nenhum gasto lançado para este lote ainda.</p>
            ) : (
              categorias.map((c) => (
                <div key={c.categoria} className="gasto-categoria-linha">
                  <div className="gasto-categoria-topo">
                    <span>{c.categoria}</span>
                    <strong>{brl(c.total)}</strong>
                  </div>
                  <div className="gasto-categoria-barra">
                    <div
                      className="gasto-categoria-barra-preenchida"
                      style={{ width: `${(c.total / maiorGasto) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
