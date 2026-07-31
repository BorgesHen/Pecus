'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  ModuloSistema,
  NivelAcesso,
  campoAtivo as campoAtivoRegistro,
  recursoPersonalizadoAtivo,
  type ConfiguracaoEmpresa,
} from '@pecus/shared';
import { obterMinhasPermissoes, type MinhasPermissoes } from '@/lib/permissoes';
import { obterConfiguracaoEmpresa } from '@/lib/empresas';

interface PermissoesContextValor {
  permissoes: MinhasPermissoes | null;
  configEmpresa: ConfiguracaoEmpresa | null;
  podeAcessar: (modulo: ModuloSistema) => boolean;
  podeEditar: (modulo: ModuloSistema) => boolean;
  campoAtivo: (chave: string) => boolean;
  /** Recurso sob encomenda liberado pra esta fazenda (ex: RECURSO_OVINOS). */
  temRecurso: (chave: string) => boolean;
  /** Atualiza a configuração da empresa em todo o app (menu, forms) sem precisar recarregar a página. */
  definirConfigEmpresa: (config: ConfiguracaoEmpresa) => void;
  /**
   * Rebusca a configuração da empresa ativa no servidor e propaga pro app.
   * Use quando a alteração não devolve a config da empresa ativa — por exemplo
   * na tela de Recursos personalizados, onde o ADMIN pode estar editando outra
   * fazenda (aí o rebusca simplesmente confirma a atual, sem efeito colateral).
   */
  recarregarConfigEmpresa: () => Promise<void>;
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
    temRecurso: (chave) => recursoPersonalizadoAtivo(configEmpresa?.recursosPersonalizados, chave),
    definirConfigEmpresa: setConfigEmpresa,
    // Best-effort de propósito: é só propagação de estado, então uma falha aqui
    // (ex: ADMIN de suporte sem fazenda ativa) não pode fazer uma gravação que
    // deu certo parecer que falhou pra quem clicou em Salvar.
    recarregarConfigEmpresa: async () => {
      try {
        setConfigEmpresa(await obterConfiguracaoEmpresa());
      } catch {
        // mantém a configuração atual em memória
      }
    },
  };

  return <PermissoesContext.Provider value={valor}>{children}</PermissoesContext.Provider>;
}

export function usePermissoes() {
  const contexto = useContext(PermissoesContext);
  if (!contexto) throw new Error('usePermissoes precisa estar dentro de um PermissoesProvider.');
  return contexto;
}
