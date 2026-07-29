import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Pecus',
  description: 'Controle de agropecuária: lotes, pesagens, gastos e relatórios',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Síncrono e o mais cedo possível: marca que JS está ativo antes da página pintar,
            pra CSS poder decidir esconder conteúdo de efeito só quando há JS pra revelar depois. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
