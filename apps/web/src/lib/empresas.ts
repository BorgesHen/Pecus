import { api } from './api';
import type { Empresa, ConfiguracaoEmpresa } from '@pecus/shared';

/** Empresas às quais o usuário logado tem vínculo (ou todas, se for ADMIN). */
export function listarMinhasEmpresas() {
  return api<Empresa[]>('/empresas');
}

/** Painel de Configurações: módulos ativos + valores-padrão da empresa ativa. */
export function obterConfiguracaoEmpresa() {
  return api<ConfiguracaoEmpresa>('/empresas/configuracao');
}

export function atualizarConfiguracaoEmpresa(dados: Partial<ConfiguracaoEmpresa>) {
  return api<ConfiguracaoEmpresa>('/empresas/configuracao', { method: 'PATCH', body: dados });
}

/** Tela "Recursos personalizados" (só ADMIN): liga/desliga recursos sob encomenda pra uma fazenda específica. */
export function atualizarRecursosPersonalizados(empresaId: string, recursos: string[]) {
  return api<ConfiguracaoEmpresa>(`/empresas/${empresaId}/recursos-personalizados`, {
    method: 'PATCH',
    body: { recursos },
  });
}
