import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioAutenticado } from '@pecus/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  /** O retorno vira request.user */
  async validate(payload: any): Promise<UsuarioAutenticado> {
    return {
      id: payload.sub,
      email: payload.email,
      nome: payload.nome,
      papelGlobal: payload.papelGlobal,
      empresaAtivaId: payload.empresaAtivaId,
    };
  }
}
