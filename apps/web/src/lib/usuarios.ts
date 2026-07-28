import { api } from './api';
import type { PapelUsuario, PermissoesGranulares, NivelAcesso } from '@pecus/shared';

export interface VinculoUsuario {
  id: string;
  usuarioId: string;
  empresaId: string;
  papel: PapelUsuario;
  permissoes?: PermissoesGranulares | null;
  usuario: { id: string; nome: string; email: string; usuario: string; createdAt: string };
}

export interface NovoUsuario {
  nome: string;
  usuario: string;
  email: string;
  senha: string;
  papel?: PapelUsuario;
  permissoes?: PermissoesGranulares;
}

export function listarUsuarios() {
  return api<VinculoUsuario[]>('/usuarios');
}

export function criarUsuario(dados: NovoUsuario) {
  return api<VinculoUsuario>('/usuarios', { method: 'POST', body: dados });
}

export interface InfoUsuario {
  nome?: string;
  usuario?: string;
  email?: string;
}

export function atualizarInfoUsuario(usuarioId: string, dados: InfoUsuario) {
  return api<{ id: string }>(`/usuarios/${usuarioId}`, { method: 'PATCH', body: dados });
}

export function atualizarPermissoes(usuarioId: string, permissoes: Record<string, NivelAcesso>) {
  return api<VinculoUsuario>(`/usuarios/${usuarioId}/permissoes`, {
    method: 'PATCH',
    body: { permissoes },
  });
}

export function removerUsuario(usuarioId: string) {
  return api<{ ok: true }>(`/usuarios/${usuarioId}`, { method: 'DELETE' });
}
