'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro('');
    setCarregando(true);
    try {
      await login(email, senha);
      router.push('/dashboard');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao entrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-auth">
      <div className="box-auth box-auth--quadrado">
        <img src="/logo.png" alt="Pecus" className="logo-auth" />
        <p style={{ color: 'var(--texto-suave)', marginBottom: 16, fontSize: 14, textAlign: 'center' }}>
          Seja bem-vindo(a) ao seu portal de gerenciamento rural
        </p>

        {erro && <div className="erro">{erro}</div>}

        <div className="campo">
          <label>E-mail</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()}
          />
        </div>

        <div className="campo">
          <label>Senha</label>
          <input
            className="input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()}
          />
        </div>

        <button className="btn" style={{ width: '100%' }} onClick={entrar} disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          Não tem conta? <Link href="/cadastro">Cadastre sua fazenda</Link>
        </p>
      </div>
    </div>
  );
}
