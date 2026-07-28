'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UsuarioAutenticado } from '@pecus/shared';
import { getToken, clearToken } from '@/lib/api';
import { me } from '@/lib/auth';

/** Valida a sessão no backend (GET /auth/me) e redireciona pro login se não houver uma válida. */
export function useAuth() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    me()
      .then(setUsuario)
      .catch(() => {
        clearToken();
        router.replace('/login');
      })
      .finally(() => setCarregando(false));
  }, [router]);

  return { usuario, carregando };
}
