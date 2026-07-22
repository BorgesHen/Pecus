const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

const TOKEN_KEY = 'pecus_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // envia o token (padrão true)
}

/** Wrapper único de fetch para a API. Lança Error com a mensagem do backend. */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let mensagem = `Erro ${res.status}`;
    try {
      const erro = await res.json();
      mensagem = Array.isArray(erro.message) ? erro.message.join(', ') : erro.message ?? mensagem;
    } catch {
      // resposta sem JSON
    }
    throw new Error(mensagem);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
