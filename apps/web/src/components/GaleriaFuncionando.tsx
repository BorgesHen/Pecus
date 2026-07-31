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
          {/* A imagem fica numa área com rolagem própria: no celular ela é
              renderizada maior que a tela pra dar pra ler a interface, e o
              usuário arrasta na horizontal. A legenda fica fora, então não
              sai de vista junto. */}
          <div className="landing-lightbox-area" onClick={(e) => e.stopPropagation()}>
            <img src={`/screenshots/${aberta.arquivo}.png`} alt={aberta.legenda} />
          </div>
          <p onClick={(e) => e.stopPropagation()}>
            {aberta.legenda}
            <span className="landing-lightbox-dica">Arraste pra ver os detalhes.</span>
          </p>
        </div>
      )}
    </>
  );
}
