'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { esqueciSenha, login } from '@/lib/auth';
import { CampoSenha } from '@/components/CampoSenha';
import { useToast } from '@/contexts/ToastContext';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [modalEsqueci, setModalEsqueci] = useState(false);
  const [usuarioEsqueci, setUsuarioEsqueci] = useState('');
  const [enviando, setEnviando] = useState(false);

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

  function abrirEsqueci() {
    // Já vem preenchido com o que a pessoa digitou — normalmente é o login dela.
    setUsuarioEsqueci(usuario);
    setModalEsqueci(true);
  }

  async function pedirSenhaProvisoria() {
    if (usuarioEsqueci.trim().length < 3) return;
    setEnviando(true);
    try {
      const r = await esqueciSenha(usuarioEsqueci.trim());
      setModalEsqueci(false);
      toast.sucesso(r.mensagem);
    } catch (e) {
      toast.erroDe(e, 'Não foi possível solicitar a senha provisória');
    } finally {
      setEnviando(false);
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

        <p style={{ marginTop: 14, fontSize: 14, textAlign: 'center' }}>
          <button type="button" className="link-botao" onClick={abrirEsqueci}>
            Esqueci minha senha
          </button>
        </p>

        <p style={{ marginTop: 10, fontSize: 14, textAlign: 'center' }}>
          Não tem conta? <Link href="/cadastro">Cadastre sua fazenda</Link>
        </p>
      </div>

      {modalEsqueci && (
        <div className="modal-overlay" onClick={() => setModalEsqueci(false)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <h3>Esqueci minha senha</h3>
            <p style={{ color: 'var(--texto-suave)', fontSize: 14, marginBottom: 16 }}>
              Confirme seu usuário. Vamos enviar uma senha provisória para o e-mail cadastrado na
              sua conta — com ela você entra e cria uma senha nova.
            </p>

            <div className="campo">
              <label>Usuário</label>
              <input
                className="input"
                value={usuarioEsqueci}
                autoFocus
                onChange={(e) => setUsuarioEsqueci(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && pedirSenhaProvisoria()}
              />
            </div>

            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setModalEsqueci(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={pedirSenhaProvisoria}
                disabled={enviando || usuarioEsqueci.trim().length < 3}
              >
                {enviando ? 'Enviando...' : 'Enviar senha provisória'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
