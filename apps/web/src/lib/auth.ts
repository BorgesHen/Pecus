import { api, setToken, clearToken } from './api';
import type { UsuarioAutenticado } from '@pecus/shared';

interface RespostaAuth {
  access_token: string;
  usuario: UsuarioAutenticado;
}

export async function login(usuario: string, senha: string) {
  const resp = await api<RespostaAuth>('/auth/login', {
    method: 'POST',
    body: { usuario, senha },
    auth: false,
  });
  setToken(resp.access_token);
  return resp.usuario;
}

export async function registrar(dados: {
  codigoConvite: string;
  nome: string;
  usuario: string;
  email: string;
  senha: string;
  nomeEmpresa: string;
}) {
  const resp = await api<RespostaAuth>('/auth/registrar', {
    method: 'POST',
    body: dados,
    auth: false,
  });
  setToken(resp.access_token);
  return resp.usuario;
}

export async function me() {
  return api<UsuarioAutenticado>('/auth/me');
}

/** Troca a empresa ativa (multi-fazenda/consultor) e salva o token reemitido. */
export async function trocarEmpresa(empresaId: string) {
  const resp = await api<RespostaAuth>('/auth/trocar-empresa', {
    method: 'POST',
    body: { empresaId },
  });
  setToken(resp.access_token);
  return resp.usuario;
}

export function logout() {
  clearToken();
}

/** Primeiro acesso: troca a senha provisória pela definitiva e reemite o token. */
export async function definirSenha(novaSenha: string, confirmacao: string) {
  const resp = await api<RespostaAuth>('/auth/definir-senha', {
    method: 'POST',
    body: { novaSenha, confirmacao },
  });
  setToken(resp.access_token);
  return resp.usuario;
}

/**
 * "Esqueci minha senha" na tela de login. Só manda o login — a provisória vai
 * pro e-mail cadastrado e nunca volta na resposta.
 */
export function esqueciSenha(usuario: string) {
  return api<{ ok: true; mensagem: string }>('/auth/esqueci-senha', {
    method: 'POST',
    body: { usuario },
    auth: false,
  });
}
