import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CAMPO_MODULO_ATIVO, LABEL_MODULO_SISTEMA, ModuloSistema, PapelUsuario, UsuarioAutenticado } from '@pecus/shared';
import { MODULO_ATIVO_KEY } from '../decorators/modulo-ativo.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Checa se o módulo está ativado para a FAZENDA (Empresa.modulo*Ativo), não
 * pro usuário — isso é o painel de Configurações (ativar/desativar módulos
 * inteiros pra empresa). ADMIN sempre passa. Complementar ao PermissoesGuard
 * (que checa nível de acesso do usuário dentro de um módulo já ativo).
 */
@Injectable()
export class ModuloAtivoGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const modulo = this.reflector.getAllAndOverride<ModuloSistema>(MODULO_ATIVO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!modulo) return true;

    const campo = CAMPO_MODULO_ATIVO[modulo];
    if (!campo) return true;

    const request = context.switchToHttp().getRequest();
    const user: UsuarioAutenticado = request.user;
    if (!user?.empresaAtivaId) return true;
    if (user.papelGlobal === PapelUsuario.ADMIN) return true;

    const empresa = (await this.prisma.empresa.findUnique({
      where: { id: user.empresaAtivaId },
      select: { [campo]: true },
    })) as unknown as Record<string, boolean> | null;

    if (!empresa || !empresa[campo]) {
      throw new ForbiddenException(
        `O módulo "${LABEL_MODULO_SISTEMA[modulo]}" não está ativo para esta fazenda.`,
      );
    }

    return true;
  }
}
