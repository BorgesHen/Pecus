import { api } from './api';
import type { PapelUsuario, PermissoesGranulares } from '@pecus/shared';

export interface MinhasPermissoes {
  papel: PapelUsuario;
  permissoes: PermissoesGranulares;
}

export function obterMinhasPermissoes() {
  return api<MinhasPermissoes>('/usuarios/me/permissoes');
}
