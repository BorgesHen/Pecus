import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UsuarioAutenticado } from '@pecus/shared';

/** Injeta o usuário autenticado (payload do JWT) no handler. */
export const CurrentUser = createParamDecorator(
  (data: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: UsuarioAutenticado = request.user;
    return data ? user?.[data] : user;
  },
);
