'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registrar } from '@/lib/auth';

export default function CadastroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', nomeEmpresa: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  function set(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function cadastrar() {
    setErro('');
    setCarregando(true);
    try {
      await registrar(form);
      router.push('/dashboard');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao cadastrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-auth">
      <div className="box-auth">
        <img src="/logo.png" alt="Pecus" className="logo-auth" />
        <h1 style={{ marginBottom: 4, textAlign: 'center', fontSize: 20 }}>Cadastrar fazenda</h1>
        <p style={{ color: 'var(--texto-suave)', marginBottom: 20, fontSize: 14, textAlign: 'center' }}>
          Você será o responsável e poderá convidar outros usuários depois
        </p>

        {erro && <div className="erro">{erro}</div>}

        <div className="campo">
          <label>Seu nome</label>
          <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
        </div>
        <div className="campo">
          <label>Nome da fazenda / empresa</label>
          <input
            className="input"
            value={form.nomeEmpresa}
            onChange={(e) => set('nomeEmpresa', e.target.value)}
          />
        </div>
        <div className="campo">
          <label>E-mail</label>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </div>
        <div className="campo">
          <label>Senha (mín. 6 caracteres)</label>
          <input
            className="input"
            type="password"
            value={form.senha}
            onChange={(e) => set('senha', e.target.value)}
          />
        </div>

        <button
          className="btn"
          style={{ width: '100%' }}
          onClick={cadastrar}
          disabled={carregando}
        >
          {carregando ? 'Cadastrando...' : 'Criar conta e fazenda'}
        </button>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
