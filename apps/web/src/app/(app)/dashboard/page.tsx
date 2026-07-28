'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Dashboard {
  totalLotes: number;
  totalAnimais: number;
  totalGasto: number;
  vencimentosSanitarios: { vencidos: number; proximos7Dias: number };
  gastosPorCategoria: { categoria: string; total: number }[];
}

export default function DashboardPage() {
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api<Dashboard>('/relatorios/dashboard')
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar'));
  }, []);

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const maiorGasto = dados ? Math.max(1, ...dados.gastosPorCategoria.map((g) => g.total)) : 1;

  return (
    <div className="container">
      <h2 style={{ marginBottom: 20 }}>Visão geral</h2>

      {erro && <div className="erro">{erro}</div>}

      {!dados && !erro && <p>Carregando...</p>}

      {dados && (
        <>
          <div className="grid-cards">
            <div className="card">
              <div className="metrica">{dados.totalLotes}</div>
              <div className="metrica-label">Lotes ativos</div>
            </div>
            <div className="card">
              <div className="metrica">{dados.totalAnimais}</div>
              <div className="metrica-label">Animais</div>
            </div>
            <div className="card">
              <div className="metrica">{brl(dados.totalGasto)}</div>
              <div className="metrica-label">Gasto total</div>
            </div>
            <div
              className="card"
              style={
                dados.vencimentosSanitarios.vencidos > 0
                  ? { background: 'var(--erro)', color: '#fff' }
                  : undefined
              }
            >
              <div className="metrica" style={dados.vencimentosSanitarios.vencidos > 0 ? { color: '#fff' } : undefined}>
                {dados.vencimentosSanitarios.vencidos}
              </div>
              <div
                className="metrica-label"
                style={dados.vencimentosSanitarios.vencidos > 0 ? { color: 'rgba(255,255,255,0.85)' } : undefined}
              >
                <Link href="/sanidade" style={{ color: 'inherit' }}>
                  Vencidos (sanidade)
                </Link>
              </div>
            </div>
            <div className="card">
              <div className="metrica">{dados.vencimentosSanitarios.proximos7Dias}</div>
              <div className="metrica-label">
                <Link href="/sanidade">Próximos 7 dias (sanidade)</Link>
              </div>
            </div>
          </div>

          <h3 style={{ margin: '28px 0 12px' }}>Gastos por categoria</h3>
          <div className="card">
            {dados.gastosPorCategoria.length === 0 ? (
              <p style={{ color: 'var(--texto-suave)' }}>
                Nenhum gasto lançado ainda. Comece cadastrando um lote e lançando gastos.
              </p>
            ) : (
              dados.gastosPorCategoria.map((g) => (
                <div key={g.categoria} className="gasto-categoria-linha">
                  <div className="gasto-categoria-topo">
                    <span>{g.categoria}</span>
                    <strong>{brl(g.total)}</strong>
                  </div>
                  <div className="gasto-categoria-barra">
                    <div
                      className="gasto-categoria-barra-preenchida"
                      style={{ width: `${(g.total / maiorGasto) * 100}%` }}
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
