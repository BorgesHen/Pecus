import type { Metadata } from 'next';
import '../styles/globals.css';
import { ToastProvider } from '@/contexts/ToastContext';

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
      {/* Provider na raiz pra o toast sobreviver à troca de tela e valer também
          no login/cadastro, que estão fora do grupo (app). */}
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
