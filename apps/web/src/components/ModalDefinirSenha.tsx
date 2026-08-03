'use client';

import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { definirSenha } from '@/lib/auth';
import { CampoSenha } from './CampoSenha';
import { useToast } from '@/contexts/ToastContext';

const MINIMO = 6;

/**
 * Primeiro acesso (ou acesso após reset): a pessoa define a senha dela.
 *
 * Não tem botão de cancelar nem fecha clicando fora de propósito — é a única
 * ação permitida enquanto a senha é provisória. O backend recusa as outras
 * rotas de qualquer forma, então oferecer uma saída aqui só levaria a um app
 * cheio de erro 403.
 */
export function ModalDefinirSenha({ nome }: { nome: string }) {
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const curta = senha.length > 0 && senha.length < MINIMO;
  const diferentes = confirmacao.length > 0 && senha !== confirmacao;
  const podeSalvar = senha.length >= MINIMO && senha === confirmacao && !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    try {
      await definirSenha(senha, confirmacao);
      toast.sucesso('Senha criada. Bom trabalho!');
      // Recarrega pra o app subir com o token novo, já sem senha provisória.
      window.location.href = '/dashboard';
    } catch (e) {
      toast.erroDe(e, 'Não foi possível salvar a senha');
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="popup-icone popup-icone--pergunta" aria-hidden>
          <KeyRound size={22} />
        </div>
        <h3 style={{ textAlign: 'center' }}>Crie sua senha</h3>
        <p style={{ color: 'var(--texto-suave)', fontSize: 14, textAlign: 'center', marginBottom: 18 }}>
          Olá, {nome.split(' ')[0]}! Você entrou com uma senha provisória. Escolha a senha que vai
          usar de agora em diante — só você vai conhecê-la.
        </p>

        <CampoSenha label={`Nova senha (mínimo ${MINIMO} caracteres)`} value={senha} onChange={setSenha} />
        {curta && <p className="campo-erro">A senha precisa ter ao menos {MINIMO} caracteres.</p>}

        <CampoSenha
          label="Repita a nova senha"
          value={confirmacao}
          onChange={setConfirmacao}
          onKeyDown={(e) => e.key === 'Enter' && salvar()}
        />
        {diferentes && <p className="campo-erro">As senhas não coincidem.</p>}

        <button
          className="btn"
          style={{ width: '100%', marginTop: 8 }}
          onClick={salvar}
          disabled={!podeSalvar}
        >
          {salvando ? 'Salvando...' : 'Salvar e entrar'}
        </button>
      </div>
    </div>
  );
}
