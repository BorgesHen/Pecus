'use client';

import { useAuth } from '@/hooks/useAuth';
import { NavShell } from '@/components/NavShell';
import { ModalDefinirSenha } from '@/components/ModalDefinirSenha';
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

  /**
   * Sessão com senha provisória não monta o app: o backend recusa todas as
   * rotas escopadas nesse estado, então renderizar as telas só produziria erro.
   * O único caminho é definir a senha.
   */
  if (usuario.senhaProvisoria) {
    return <ModalDefinirSenha nome={usuario.nome} />;
  }

  return (
    <PermissoesProvider>
      <NavShell usuario={usuario}>{children}</NavShell>
    </PermissoesProvider>
  );
}
