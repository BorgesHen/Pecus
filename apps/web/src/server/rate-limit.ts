import { UnauthorizedException } from '@nestjs/common';
import { prisma } from './prisma';

const JANELA_MS = 15 * 60 * 1000;
const LIMITE_POR_USUARIO = 6;
const LIMITE_POR_IP = 8;
const RETENCAO_MS = 24 * 60 * 60 * 1000;

/** IP do cliente a partir dos headers — Vercel (e a maioria dos proxies) preenche x-forwarded-for. */
export function ipDoRequest(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'desconhecido';
}

/**
 * Bloqueia login por força bruta: limita tentativas falhas recentes tanto
 * por usuário (protege uma conta específica de ataque distribuído entre IPs)
 * quanto por IP (protege contra credential stuffing varrendo vários usuários).
 */
export async function checarBloqueioLogin(usuario: string, ip: string) {
  const desde = new Date(Date.now() - JANELA_MS);
  const [porUsuario, porIp] = await Promise.all([
    prisma.tentativaLogin.count({ where: { usuario, sucesso: false, createdAt: { gte: desde } } }),
    prisma.tentativaLogin.count({ where: { ip, sucesso: false, createdAt: { gte: desde } } }),
  ]);
  if (porUsuario >= LIMITE_POR_USUARIO || porIp >= LIMITE_POR_IP) {
    throw new UnauthorizedException('Muitas tentativas de login. Aguarde alguns minutos e tente de novo.');
  }
}

/** Registra o resultado da tentativa e aproveita pra limpar registros antigos, sem precisar de um cron. */
export async function registrarTentativaLogin(usuario: string, ip: string, sucesso: boolean) {
  await prisma.tentativaLogin.create({ data: { usuario, ip, sucesso } });
  prisma.tentativaLogin.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENCAO_MS) } } }).catch(() => {});
}
