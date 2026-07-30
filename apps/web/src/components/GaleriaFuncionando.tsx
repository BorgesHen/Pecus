'use client';

import { useEffect, useState } from 'react';
import { AoAparecer } from './AoAparecer';

interface Captura {
  arquivo: string;
  legenda: string;
}

export function GaleriaFuncionando({ capturas }: { capturas: Captura[] }) {
  const [aberta, setAberta] = useState<Captura | null>(null);

  useEffect(() => {
    if (!aberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberta(null);
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberta]);

  return (
    <>
      <div className="landing-galeria">
        {capturas.map((c, i) => (
          <AoAparecer key={c.arquivo} atraso={i * 60}>
            <figure className="landing-galeria-item" onClick={() => setAberta(c)}>
              <img src={`/screenshots/${c.arquivo}.png`} alt={c.legenda} />
              <figcaption>{c.legenda}</figcaption>
            </figure>
          </AoAparecer>
        ))}
      </div>

      {aberta && (
        <div className="landing-lightbox" onClick={() => setAberta(null)}>
          <button
            className="landing-lightbox-fechar"
            onClick={() => setAberta(null)}
            aria-label="Fechar"
          >
            ×
          </button>
          <img
            src={`/screenshots/${aberta.arquivo}.png`}
            alt={aberta.legenda}
            onClick={(e) => e.stopPropagation()}
          />
          <p onClick={(e) => e.stopPropagation()}>{aberta.legenda}</p>
        </div>
      )}
    </>
  );
}
