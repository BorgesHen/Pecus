'use client';

import { useState } from 'react';
import { Check, Copy, Mail, MailX } from 'lucide-react';
import type { CredenciaisProvisorias } from '@/lib/usuarios';

/**
 * Mostra as credenciais provisórias pro responsável repassar.
 *
 * Existe mesmo quando o e-mail sai: o e-mail pode cair no spam, o endereço
 * pode estar errado, e o SMTP pode não estar configurado ainda. Sem esta tela o
 * recurso ficaria dependente de uma entrega que ninguém confirma.
 *
 * É a única chance de ver a senha — só o hash fica guardado.
 */
export function PopupCredenciais({
  dados,
  titulo,
  onFechar,
}: {
  dados: CredenciaisProvisorias;
  titulo: string;
  onFechar: () => void;
}) {
  const [copiado, setCopiado] = useState<'senha' | 'tudo' | null>(null);

  const textoCompleto = [
    `Acesso ao Pecus 360`,
    `Usuário: ${dados.usuario}`,
    `Senha provisória: ${dados.senhaProvisoria}`,
    ``,
    `No primeiro acesso o sistema pede pra criar a senha definitiva.`,
    `A provisória vale por ${dados.diasValidade} dias.`,
  ].join('\n');

  async function copiar(texto: string, qual: 'senha' | 'tudo') {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Contexto não seguro bloqueia a área de transferência; o valor está à
      // vista mesmo assim, dá pra selecionar à mão.
    }
  }

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>

        <div className={`credencial-aviso ${dados.emailEnviado ? '' : 'credencial-aviso--atencao'}`}>
          {dados.emailEnviado ? <Mail size={17} aria-hidden /> : <MailX size={17} aria-hidden />}
          <span>
            {dados.emailEnviado ? (
              <>
                E-mail enviado para <strong>{dados.email}</strong>. Se não chegar, repasse os dados
                abaixo.
              </>
            ) : (
              <>
                <strong>O e-mail não foi enviado.</strong> Repasse os dados abaixo para{' '}
                {dados.nome.split(' ')[0]} por WhatsApp ou pessoalmente.
              </>
            )}
          </span>
        </div>

        <div className="credencial-caixa">
          <div>
            <span>Usuário</span>
            <strong>{dados.usuario}</strong>
          </div>
          <div>
            <span>Senha provisória</span>
            <strong className="credencial-senha">{dados.senhaProvisoria}</strong>
          </div>
        </div>

        <p style={{ color: 'var(--texto-suave)', fontSize: 13, marginTop: 12 }}>
          No primeiro acesso o sistema pede pra {dados.nome.split(' ')[0]} criar a senha definitiva
          — você não vai conhecê-la. Esta provisória vale por {dados.diasValidade} dias e{' '}
          <strong>não aparece de novo</strong> depois que você fechar aqui.
        </p>

        <div className="modal-acoes">
          <button className="btn-secundario" onClick={() => copiar(dados.senhaProvisoria, 'senha')}>
            {copiado === 'senha' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            {copiado === 'senha' ? ' Copiada' : ' Copiar senha'}
          </button>
          <button className="btn-secundario" onClick={() => copiar(textoCompleto, 'tudo')}>
            {copiado === 'tudo' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            {copiado === 'tudo' ? ' Copiado' : ' Copiar mensagem'}
          </button>
          <button className="btn" onClick={onFechar}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
