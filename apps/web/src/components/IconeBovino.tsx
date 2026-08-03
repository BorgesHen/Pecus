import { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

/**
 * Cabeça de bovino, desenhada porque o lucide não tem.
 *
 * Os candidatos de lá não servem pra um menu chamado "Animais": `Beef` é um
 * corte de carne, `Milk` é leite e `Tractor` é máquina — nenhum representa
 * animal vivo, que é o que o módulo gerencia (categorias, sanidade,
 * reprodução). E a marca do Pecus 360 já tem uma cabeça de boi, então isso
 * também aproxima o menu da identidade.
 *
 * É um `forwardRef` com a mesma assinatura dos ícones do lucide, então entra
 * onde se espera um `LucideIcon` sem afrouxar tipo nenhum. Segue também as
 * convenções visuais deles: viewBox 24×24, só traço, `currentColor`, espessura
 * vinda de fora e pontas arredondadas.
 */
export const IconeBovino = forwardRef<SVGSVGElement, LucideProps>(function IconeBovino(
  { size = 24, strokeWidth = 1.75, ...resto },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...resto}
    >
      {/* Orelhas laterais: junto com o focinho largo, é o par que faz a
          silhueta ler como bovino e não como gato. Testei uma versão com
          chifres — a 18px eles viram orelhas compridas e parece cabra. */}
      <path d="M4.6 10.2C3 10 1.8 8.7 2 7.2c1.7-.2 3.1 1 3.4 2.6" />
      <path d="M19.4 10.2c1.6-.2 2.8-1.5 2.6-3-1.7-.2-3.1 1-3.4 2.6" />
      {/* Testa. */}
      <path d="M5.2 9.8C5.6 7.1 8.5 5 12 5s6.4 2.1 6.8 4.8" />
      {/* Laterais descendo até o focinho. */}
      <path d="M5.2 9.8l.5 3.4A4 4 0 0 0 8 16.3" />
      <path d="M18.8 9.8l-.5 3.4a4 4 0 0 1-2.3 3.1" />
      {/* Olhos. */}
      <path d="M9.3 10.6h.01" />
      <path d="M14.7 10.6h.01" />
      {/* Focinho largo com narinas. Trocar a curva de "sorriso" da primeira
          tentativa por isso foi o que tirou a leitura de rosto de desenho. */}
      <path d="M8 16.3c0-1 1.8-1.8 4-1.8s4 .8 4 1.8-1.8 2.7-4 2.7-4-1.7-4-2.7z" />
      <path d="M10.7 16.6h.01" />
      <path d="M13.3 16.6h.01" />
    </svg>
  );
}) as LucideIcon;
