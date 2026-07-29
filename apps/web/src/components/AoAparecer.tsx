'use client';

import { useEffect, useRef, useState } from 'react';

/** Envolve uma seção da landing page e revela ela (fade + slide) quando entra na tela. */
export function AoAparecer({
  children,
  className,
  atraso = 0,
}: {
  children: React.ReactNode;
  className?: string;
  atraso?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisivel(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);

    // Se o elemento já nasce visível na tela (ex: viewport alto, ou página aberta já rolada),
    // o observer pode demorar um frame a mais que o esperado pra disparar — força depois de 1s.
    const seguranca = setTimeout(() => setVisivel(true), 1000);

    return () => {
      observer.disconnect();
      clearTimeout(seguranca);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`ao-aparecer ${visivel ? 'ao-aparecer--visivel' : ''} ${className ?? ''}`}
      style={{ transitionDelay: visivel ? `${atraso}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}
