import nodemailer from 'nodemailer';
import { DIAS_VALIDADE_PROVISORIA } from '@pecus/shared';

/**
 * Envio de e-mail por SMTP.
 *
 * Escolhi SMTP em vez de amarrar num provedor específico porque funciona com
 * qualquer um (Resend, SendGrid, SES, Gmail, ou a hospedagem própria do
 * domínio) — a troca é só de variável de ambiente, sem mexer em código.
 *
 * **Sem SMTP configurado o sistema não quebra**: o envio é reportado como não
 * realizado e a senha provisória aparece na tela pro responsável repassar à
 * mão. É o que mantém o recurso utilizável antes do DNS/credenciais estarem
 * prontos.
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USUARIO = process.env.SMTP_USER;
const SMTP_SENHA = process.env.SMTP_PASS;
/**
  * Sem EMAIL_REMETENTE, usa a própria conta SMTP. Isso importa no Gmail: ele
  * reescreve (ou recusa) um From que não seja a conta autenticada nem um alias
  * verificado — um padrão fixo de outro domínio faria o e-mail sair com
  * remetente diferente do configurado, sem avisar ninguém.
  */
const REMETENTE = process.env.EMAIL_REMETENTE || SMTP_USUARIO || 'nao-responda@localhost';
const URL_APP = process.env.NEXT_PUBLIC_URL_APP ?? 'https://www.pecus.net.br';

export { DIAS_VALIDADE_PROVISORIA };

export function emailConfigurado(): boolean {
  return Boolean(SMTP_HOST && SMTP_USUARIO && SMTP_SENHA);
}

let transporte: nodemailer.Transporter | null = null;

function obterTransporte() {
  if (!emailConfigurado()) return null;
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      // 465 é TLS implícito; 587 sobe pra TLS via STARTTLS.
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USUARIO, pass: SMTP_SENHA },
      // Serverless tem duração limitada: SMTP travado não pode consumir tudo e
      // atrasar a resposta de quem criou o usuário. Falhar rápido é melhor —
      // a senha provisória aparece na tela de qualquer forma.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
  }
  return transporte;
}

interface Mensagem {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}

/**
 * Nunca lança: quem chama precisa saber se foi ou não, mas uma falha de e-mail
 * não pode derrubar a criação do usuário nem o reset de senha — o repasse
 * manual da senha provisória continua sendo caminho válido.
 */
export async function enviar(mensagem: Mensagem): Promise<{ enviado: boolean; motivo?: string }> {
  const t = obterTransporte();
  if (!t) {
    return { enviado: false, motivo: 'SMTP não configurado no servidor.' };
  }

  try {
    await t.sendMail({
      from: REMETENTE,
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
      html: mensagem.html,
    });
    return { enviado: true };
  } catch (e) {
    // Só loga: o fluxo segue e a tela mostra a senha pro repasse manual.
    console.error('Falha ao enviar e-mail:', e);
    return { enviado: false, motivo: e instanceof Error ? e.message : 'Erro ao enviar e-mail.' };
  }
}

function moldura(titulo: string, corpo: string): string {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px;background:#f5f3ee;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2a2a24">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2ddd3;border-radius:10px;padding:28px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#2f5d3a">Pecus 360</h1>
    <h2 style="margin:0 0 18px;font-size:16px;font-weight:600">${titulo}</h2>
    ${corpo}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2ddd3;font-size:12px;color:#6b6b60">
      Você recebeu este e-mail porque alguém com acesso à sua fazenda no Pecus 360 criou ou
      redefiniu seu acesso. Se não foi você, avise o responsável pela fazenda.
    </p>
  </div>
</body></html>`;
}

function blocoCredenciais(usuario: string, senhaProvisoria: string): string {
  return `<div style="margin:16px 0;padding:14px;background:#f5f3ee;border-radius:8px;font-size:15px">
    <div style="color:#6b6b60;font-size:12px;text-transform:uppercase;letter-spacing:.03em">Usuário</div>
    <div style="font-weight:700;margin-bottom:10px">${usuario}</div>
    <div style="color:#6b6b60;font-size:12px;text-transform:uppercase;letter-spacing:.03em">Senha provisória</div>
    <div style="font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;letter-spacing:.05em">${senhaProvisoria}</div>
  </div>
  <p style="margin:0 0 8px;font-size:15px">
    <a href="${URL_APP}/login" style="display:inline-block;padding:11px 20px;background:#2f5d3a;color:#fff;border-radius:10px;text-decoration:none;font-weight:600">Entrar no Pecus 360</a>
  </p>
  <p style="margin:12px 0 0;font-size:14px;color:#6b6b60">
    No primeiro acesso o sistema vai pedir pra você criar a sua senha definitiva.
    Esta senha provisória vale por ${DIAS_VALIDADE_PROVISORIA} dias.
  </p>`;
}

export function mensagemBoasVindas(
  nome: string,
  usuario: string,
  senhaProvisoria: string,
  nomeFazenda: string,
): Omit<Mensagem, 'para'> {
  const titulo = `Seu acesso à fazenda ${nomeFazenda}`;
  return {
    assunto: `Pecus 360 — seu acesso à fazenda ${nomeFazenda}`,
    texto: [
      `Olá, ${nome}.`,
      ``,
      `Foi criado um acesso pra você no Pecus 360, na fazenda ${nomeFazenda}.`,
      ``,
      `Usuário: ${usuario}`,
      `Senha provisória: ${senhaProvisoria}`,
      ``,
      `Entre em ${URL_APP}/login — no primeiro acesso o sistema pede pra você criar sua senha definitiva.`,
      `A senha provisória vale por ${DIAS_VALIDADE_PROVISORIA} dias.`,
    ].join('\n'),
    html: moldura(
      titulo,
      `<p style="margin:0 0 4px;font-size:15px">Olá, <strong>${nome}</strong>.</p>
       <p style="margin:0;font-size:15px">Foi criado um acesso pra você na fazenda <strong>${nomeFazenda}</strong>.</p>
       ${blocoCredenciais(usuario, senhaProvisoria)}`,
    ),
  };
}

export function mensagemSenhaRedefinida(
  nome: string,
  usuario: string,
  senhaProvisoria: string,
): Omit<Mensagem, 'para'> {
  return {
    assunto: 'Pecus 360 — sua senha provisória',
    texto: [
      `Olá, ${nome}.`,
      ``,
      `Sua senha do Pecus 360 foi redefinida. Use a senha provisória abaixo pra entrar:`,
      ``,
      `Usuário: ${usuario}`,
      `Senha provisória: ${senhaProvisoria}`,
      ``,
      `Entre em ${URL_APP}/login — o sistema vai pedir pra você criar uma nova senha.`,
      `A senha provisória vale por ${DIAS_VALIDADE_PROVISORIA} dias.`,
    ].join('\n'),
    html: moldura(
      'Sua senha provisória',
      `<p style="margin:0 0 4px;font-size:15px">Olá, <strong>${nome}</strong>.</p>
       <p style="margin:0;font-size:15px">Sua senha foi redefinida. Use a provisória abaixo pra entrar e criar uma nova.</p>
       ${blocoCredenciais(usuario, senhaProvisoria)}`,
    ),
  };
}
