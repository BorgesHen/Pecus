'use client';

import { useAuth } from '@/hooks/useAuth';
import { NavShell } from '@/components/NavShell';
import { PermissoesProvider } from '@/contexts/PermissoesContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();

  if (carregando || !usuario) {
    return (
      <div className="shell-carregando">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <PermissoesProvider>
      <NavShell usuario={usuario}>{children}</NavShell>
    </PermissoesProvider>
  );
}
