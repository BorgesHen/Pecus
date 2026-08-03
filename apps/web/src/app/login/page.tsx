'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { CampoSenha } from '@/components/CampoSenha';
import { useToast } from '@/contexts/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setCarregando(true);
    try {
      const logado = await login(usuario, senha);
      // O provider do toast fica na raiz, então a mensagem sobrevive à navegação
      // e aparece já no painel.
      toast.sucesso(`Bem-vindo(a), ${logado.nome.split(' ')[0]}!`);
      router.push('/dashboard');
    } catch (e) {
      toast.erroDe(e, 'Falha ao entrar');
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

        <div className="campo">
          <label>Usuário</label>
          <input
            className="input"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && entrar()}
          />
        </div>

        <CampoSenha
          label="Senha"
          value={senha}
          onChange={setSenha}
          onKeyDown={(e) => e.key === 'Enter' && entrar()}
        />

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
