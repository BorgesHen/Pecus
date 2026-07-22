import { SetMetadata } from '@nestjs/common';
import { ModuloSistema, NivelAcesso } from '@pecus/shared';

export const PERMISSAO_KEY = 'permissao';

export interface PermissaoRequerida {
  modulo: ModuloSistema;
  nivel: NivelAcesso; // nível mínimo exigido (VER ou EDITAR)
}

/**
 * Exige que o USUARIO tenha ao menos determinado nível de acesso num módulo.
 * Ex: @Permissao(ModuloSistema.GASTOS, NivelAcesso.EDITAR)
 */
export const Permissao = (modulo: ModuloSistema, nivel: NivelAcesso) =>
  SetMetadata(PERMISSAO_KEY, { modulo, nivel } as PermissaoRequerida);
