'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { registrar } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { PopupErro } from '@/components/PopupErro';
import { CampoSenha } from '@/components/CampoSenha';

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    codigoConvite: searchParams.get('convite') ?? '',
    nome: '',
    usuario: '',
    email: '',
    senha: '',
    nomeEmpresa: '',
  });
  const [erro, setErro] = useState('');
  const [erroDuplicidade, setErroDuplicidade] = useState('');
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
      if (e instanceof ApiError && e.status === 409) {
        setErroDuplicidade(e.message);
      } else {
        setErro(e instanceof Error ? e.message : 'Falha ao cadastrar');
      }
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
          <label>Código de convite</label>
          <input
            className="input"
            value={form.codigoConvite}
            onChange={(e) => set('codigoConvite', e.target.value.toUpperCase())}
            placeholder="Se não possuir o código, entre em contato com o administrador"
          />
        </div>
        <div className="campo">
          <label>Seu nome</label>
          <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
        </div>
        <div className="campo">
          <label>Usuário (para fazer login)</label>
          <input
            className="input"
            value={form.usuario}
            onChange={(e) => set('usuario', e.target.value)}
          />
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
        <CampoSenha label="Senha (mín. 6 caracteres)" value={form.senha} onChange={(v) => set('senha', v)} />

        <button
          className="btn"
          style={{ width: '100%' }}
          onClick={cadastrar}
          disabled={carregando || !form.codigoConvite}
        >
          {carregando ? 'Cadastrando...' : 'Criar conta e fazenda'}
        </button>

        <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>

      {erroDuplicidade && (
        <PopupErro mensagem={erroDuplicidade} onFechar={() => setErroDuplicidade('')} />
      )}
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={null}>
      <CadastroForm />
    </Suspense>
  );
}
