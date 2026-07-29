import jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import type { UsuarioAutenticado } from '@pecus/shared';

const SEGREDO: string =
  process.env.JWT_SECRET ??
  (() => {
    throw new Error('JWT_SECRET não configurado.');
  })();

export function assinarToken(payload: UsuarioAutenticado): string {
  return jwt.sign(payload, SEGREDO, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions);
}

/** Extrai e valida o JWT do header Authorization. Equivalente ao JwtAuthGuard + JwtStrategy. */
export function usuarioDoRequest(req: Request): UsuarioAutenticado {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new UnauthorizedException('Token não informado.');
  try {
    return jwt.verify(token, SEGREDO) as unknown as UsuarioAutenticado;
  } catch {
    throw new UnauthorizedException('Token inválido ou expirado.');
  }
}
