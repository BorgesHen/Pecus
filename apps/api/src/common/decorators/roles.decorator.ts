import { SetMetadata } from '@nestjs/common';
import { PapelUsuario } from '@pecus/shared';

export const ROLES_KEY = 'roles';

/**
 * Restringe uma rota a determinados papéis.
 * Ex: @Roles(PapelUsuario.ADMIN, PapelUsuario.RESPONSAVEL)
 */
export const Roles = (...roles: PapelUsuario[]) => SetMetadata(ROLES_KEY, roles);
