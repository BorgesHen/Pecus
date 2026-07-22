import { api, setToken, clearToken } from './api';
import type { UsuarioAutenticado } from '@pecus/shared';

interface RespostaAuth {
  access_token: string;
  usuario: UsuarioAutenticado;
}

export async function login(email: string, senha: string) {
  const resp = await api<RespostaAuth>('/auth/login', {
    method: 'POST',
    body: { email, senha },
    auth: false,
  });
  setToken(resp.access_token);
  return resp.usuario;
}

export async function registrar(dados: {
  nome: string;
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

export function logout() {
  clearToken();
}
