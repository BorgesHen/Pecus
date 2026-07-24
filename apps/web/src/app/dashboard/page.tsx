'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import { logout } from '@/lib/auth';

interface Dashboard {
  totalLotes: number;
  totalAnimais: number;
  totalGasto: number;
  gastosPorCategoria: { categoria: string; total: number }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<Dashboard>('/relatorios/dashboard')
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar'));
  }, [router]);

  function sair() {
    logout();
    router.replace('/login');
  }

  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div>
      <div className="topbar">
        <div className="topbar-brand">
          <strong>Pecus</strong>
          <span className="topbar-nav">
            {/* navegação — as telas de lotes/gastos entram depois no VS Code */}
            Lotes · Pesagens · Gastos · Relatórios
          </span>
        </div>
        <button
          onClick={sair}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#fff',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>

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
            </div>

            <h3 style={{ margin: '28px 0 12px' }}>Gastos por categoria</h3>
            <div className="card">
              {dados.gastosPorCategoria.length === 0 ? (
                <p style={{ color: 'var(--texto-suave)' }}>
                  Nenhum gasto lançado ainda. Comece cadastrando um lote e lançando gastos.
                </p>
              ) : (
                dados.gastosPorCategoria.map((g) => (
                  <div
                    key={g.categoria}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--borda)',
                    }}
                  >
                    <span>{g.categoria}</span>
                    <strong>{brl(g.total)}</strong>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
