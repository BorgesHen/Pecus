import { api } from './api';
import type { PapelUsuario, PermissoesGranulares, NivelAcesso } from '@pecus/shared';

export interface VinculoUsuario {
  id: string;
  usuarioId: string;
  empresaId: string;
  papel: PapelUsuario;
  permissoes?: PermissoesGranulares | null;
  usuario: {
    id: string;
    nome: string;
    email: string;
    usuario: string;
    createdAt: string;
    /** Ainda não definiu a senha definitiva (conta nova ou senha resetada). */
    senhaProvisoria: boolean;
    senhaProvisoriaExpiraEm?: string | null;
    /** Confirmou o e-mail ao definir a senha a partir de uma provisória enviada. */
    emailVerificadoEm?: string | null;
  };
}

export interface NovoUsuario {
  nome: string;
  usuario: string;
  email: string;
  papel?: PapelUsuario;
  permissoes?: PermissoesGranulares;
}

/** O que volta ao criar/resetar: a provisória pra repassar e se o e-mail saiu. */
export interface CredenciaisProvisorias {
  usuario: string;
  nome: string;
  email: string;
  senhaProvisoria: string;
  emailEnviado: boolean;
  diasValidade: number;
}

export interface RespostaNovoUsuario {
  vinculo: VinculoUsuario;
  /** Falso quando o e-mail já tinha conta: só o vínculo foi criado, a senha é a dela. */
  contaNova: boolean;
  senhaProvisoria: string | null;
  emailEnviado: boolean;
}

export function listarUsuarios() {
  return api<VinculoUsuario[]>('/usuarios');
}

export function criarUsuario(dados: NovoUsuario) {
  return api<RespostaNovoUsuario>('/usuarios', { method: 'POST', body: dados });
}

/** Gera nova senha provisória e substitui a atual na hora. */
export function resetarSenhaUsuario(usuarioId: string) {
  return api<CredenciaisProvisorias>(`/usuarios/${usuarioId}/resetar-senha`, { method: 'POST' });
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
