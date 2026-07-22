import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapelUsuario, UsuarioAutenticado } from '@pecus/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Checa o papel do usuário. ADMIN passa em tudo.
 * Para checagens mais finas (permissões granulares por módulo dentro de uma
 * empresa), use o PermissoesGuard nos módulos específicos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<PapelUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UsuarioAutenticado = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    // ADMIN global tem acesso irrestrito (suporte do sistema)
    if (user.papelGlobal === PapelUsuario.ADMIN) {
      return true;
    }

    if (!requiredRoles.includes(user.papelGlobal)) {
      throw new ForbiddenException('Você não tem permissão para esta ação.');
    }

    return true;
  }
}
