'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { ModuloSistema, NivelAcesso, campoAtivo as campoAtivoRegistro, type ConfiguracaoEmpresa } from '@pecus/shared';
import { obterMinhasPermissoes, type MinhasPermissoes } from '@/lib/permissoes';
import { obterConfiguracaoEmpresa } from '@/lib/empresas';

interface PermissoesContextValor {
  permissoes: MinhasPermissoes | null;
  configEmpresa: ConfiguracaoEmpresa | null;
  podeAcessar: (modulo: ModuloSistema) => boolean;
  podeEditar: (modulo: ModuloSistema) => boolean;
  campoAtivo: (chave: string) => boolean;
  /** Atualiza a configuração da empresa em todo o app (menu, forms) sem precisar recarregar a página. */
  definirConfigEmpresa: (config: ConfiguracaoEmpresa) => void;
}

const PermissoesContext = createContext<PermissoesContextValor | null>(null);

/** Busca papel + permissões + configuração da empresa ativa uma única vez e disponibiliza pro grupo (app). */
export function PermissoesProvider({ children }: { children: React.ReactNode }) {
  const [permissoes, setPermissoes] = useState<MinhasPermissoes | null>(null);
  const [configEmpresa, setConfigEmpresa] = useState<ConfiguracaoEmpresa | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      obterMinhasPermissoes().then(setPermissoes).catch(() => setPermissoes(null)),
      obterConfiguracaoEmpresa().then(setConfigEmpresa).catch(() => setConfigEmpresa(null)),
    ]).finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="shell-carregando">
        <p>Carregando...</p>
      </div>
    );
  }

  function nivel(modulo: ModuloSistema): NivelAcesso {
    return permissoes?.permissoes[modulo] ?? NivelAcesso.NENHUM;
  }

  const valor: PermissoesContextValor = {
    permissoes,
    configEmpresa,
    podeAcessar: (modulo) => nivel(modulo) !== NivelAcesso.NENHUM,
    podeEditar: (modulo) => nivel(modulo) === NivelAcesso.EDITAR,
    campoAtivo: (chave) => campoAtivoRegistro(configEmpresa?.camposDesativados, chave),
    definirConfigEmpresa: setConfigEmpresa,
  };

  return <PermissoesContext.Provider value={valor}>{children}</PermissoesContext.Provider>;
}

export function usePermissoes() {
  const contexto = useContext(PermissoesContext);
  if (!contexto) throw new Error('usePermissoes precisa estar dentro de um PermissoesProvider.');
  return contexto;
}
