import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  NivelAcesso,
  PapelUsuario,
  PermissoesGranulares,
  UsuarioAutenticado,
} from '@pecus/shared';
import { PERMISSAO_KEY, PermissaoRequerida } from '../decorators/permissao.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Checagem granular por módulo para o papel USUARIO.
 * ADMIN e RESPONSAVEL passam direto (o responsável é dono da fazenda).
 * O USUARIO só passa se tiver o nível de acesso exigido no módulo.
 *
 * Uso: aplique @Permissao(modulo, nivel) nas rotas que quiser proteger de
 * forma fina. Registrado global em app.module.ts — sem @Permissao() na rota,
 * este guard libera (não exige nada).
 */
@Injectable()
export class PermissoesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  private atende(nivelUsuario: NivelAcesso, nivelExigido: NivelAcesso): boolean {
    const ordem = { [NivelAcesso.NENHUM]: 0, [NivelAcesso.VER]: 1, [NivelAcesso.EDITAR]: 2 };
    return ordem[nivelUsuario] >= ordem[nivelExigido];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requerida = this.reflector.getAllAndOverride<PermissaoRequerida>(PERMISSAO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requerida) return true;

    const request = context.switchToHttp().getRequest();
    const user: UsuarioAutenticado = request.user;

    if (user.papelGlobal === PapelUsuario.ADMIN) return true;

    // Busca o vínculo do usuário com a empresa ativa para ler papel + permissões
    const vinculo = await this.prisma.usuarioEmpresa.findUnique({
      where: {
        usuarioId_empresaId: { usuarioId: user.id, empresaId: user.empresaAtivaId! },
      },
    });

    if (!vinculo) throw new ForbiddenException('Sem vínculo com esta empresa.');

    // Responsável é dono da fazenda: acesso total dentro dela
    if (vinculo.papel === PapelUsuario.RESPONSAVEL) return true;

    const permissoes = (vinculo.permissoes ?? {}) as PermissoesGranulares;
    const nivelUsuario = permissoes[requerida.modulo] ?? NivelAcesso.NENHUM;

    if (!this.atende(nivelUsuario, requerida.nivel)) {
      throw new ForbiddenException(`Sem permissão de "${requerida.nivel}" no módulo ${requerida.modulo}.`);
    }

    return true;
  }
}
