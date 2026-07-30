'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface PrevisaoDia {
  data: string;
  tempMax: number;
  tempMin: number;
  probabilidadeChuva: number;
  label: string;
  icone: string;
}

export function PrevisaoTempo() {
  const [dias, setDias] = useState<PrevisaoDia[] | null>(null);
  const [erro, setErro] = useState('');
  const [permissaoNegada, setPermissaoNegada] = useState(false);

  function buscar() {
    setErro('');
    setPermissaoNegada(false);
    setDias(null);

    if (!('geolocation' in navigator)) {
      setErro('Seu navegador não suporta geolocalização.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api<{ dias: PrevisaoDia[] }>(`/clima?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
          .then((r) => setDias(r.dias))
          .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao buscar previsão do tempo'));
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissaoNegada(true);
        else setErro('Não foi possível obter sua localização.');
      },
      { timeout: 10000 },
    );
  }

  useEffect(() => {
    buscar();
  }, []);

  const diaSemana = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  const diaMes = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>Previsão do tempo (7 dias)</strong>
        {(erro || permissaoNegada) && (
          <button className="btn-secundario" onClick={buscar} style={{ padding: '6px 12px', fontSize: 13 }}>
            Tentar de novo
          </button>
        )}
      </div>

      {permissaoNegada && (
        <p style={{ color: 'var(--texto-suave)', fontSize: 14 }}>
          Permita o acesso à localização no navegador pra ver a previsão do tempo da sua região.
        </p>
      )}
      {erro && !permissaoNegada && <p style={{ color: 'var(--erro)', fontSize: 14 }}>{erro}</p>}
      {!dias && !erro && !permissaoNegada && (
        <p style={{ color: 'var(--texto-suave)' }}>Buscando sua localização...</p>
      )}

      {dias && (
        <div className="previsao-tempo-grade">
          {dias.map((d) => (
            <div key={d.data} className="previsao-tempo-dia" title={d.label}>
              <span className="previsao-tempo-dia-semana">{diaSemana(d.data)}</span>
              <span className="previsao-tempo-dia-data">{diaMes(d.data)}</span>
              <span className="previsao-tempo-icone">{d.icone}</span>
              <span className="previsao-tempo-temps">
                <strong>{Math.round(d.tempMax)}°</strong> {Math.round(d.tempMin)}°
              </span>
              <span className="previsao-tempo-chuva">💧 {d.probabilidadeChuva}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
