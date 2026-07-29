import { ForbiddenException } from '@nestjs/common';
import {
  CAMPO_MODULO_ATIVO,
  LABEL_MODULO_SISTEMA,
  ModuloSistema,
  NivelAcesso,
  PapelUsuario,
  type PermissoesGranulares,
  type UsuarioAutenticado,
} from '@pecus/shared';
import { prisma } from './prisma';
import { usuarioDoRequest } from './auth';

interface OpcoesAutorizacao {
  /** Equivalente a @Roles(...) — ausente ou [] = qualquer papel autenticado passa. */
  papeis?: PapelUsuario[];
  /** Equivalente a @ModuloAtivo(...) — checa se o módulo está ativo pra empresa. */
  moduloAtivo?: ModuloSistema;
  /** Equivalente a @Permissao(...) — checa o nível de acesso granular do usuário no módulo. */
  permissao?: { modulo: ModuloSistema; nivel: NivelAcesso };
}

const ORDEM_NIVEL: Record<NivelAcesso, number> = {
  [NivelAcesso.NENHUM]: 0,
  [NivelAcesso.VER]: 1,
  [NivelAcesso.EDITAR]: 2,
};

/**
 * Substitui a cadeia RolesGuard → ModuloAtivoGuard → PermissoesGuard do NestJS.
 * Chamar sempre no início de cada handler (o JwtAuthGuard equivalente —
 * usuarioDoRequest — já roda por dentro, incondicionalmente).
 */
export async function autorizar(req: Request, opcoes: OpcoesAutorizacao = {}) {
  const user = usuarioDoRequest(req);

  // RolesGuard
  if (opcoes.papeis && opcoes.papeis.length > 0) {
    if (user.papelGlobal !== PapelUsuario.ADMIN && !opcoes.papeis.includes(user.papelGlobal)) {
      throw new ForbiddenException('Você não tem permissão para esta ação.');
    }
  }

  // ModuloAtivoGuard
  if (opcoes.moduloAtivo) {
    await checarModuloAtivo(user, opcoes.moduloAtivo);
  }

  // PermissoesGuard
  if (opcoes.permissao) {
    await checarPermissao(user, opcoes.permissao.modulo, opcoes.permissao.nivel);
  }

  return { user };
}

async function checarModuloAtivo(user: UsuarioAutenticado, modulo: ModuloSistema) {
  const campo = CAMPO_MODULO_ATIVO[modulo];
  if (!campo) return;
  if (!user.empresaAtivaId) return;
  if (user.papelGlobal === PapelUsuario.ADMIN) return;

  const empresa = (await prisma.empresa.findUnique({
    where: { id: user.empresaAtivaId },
    select: { [campo]: true },
  })) as Record<string, boolean> | null;

  if (!empresa || !empresa[campo]) {
    throw new ForbiddenException(`O módulo "${LABEL_MODULO_SISTEMA[modulo]}" não está ativo para esta fazenda.`);
  }
}

async function checarPermissao(user: UsuarioAutenticado, modulo: ModuloSistema, nivelExigido: NivelAcesso) {
  if (user.papelGlobal === PapelUsuario.ADMIN) return;

  const vinculo = await prisma.usuarioEmpresa.findUnique({
    where: { usuarioId_empresaId: { usuarioId: user.id, empresaId: user.empresaAtivaId! } },
  });
  if (!vinculo) throw new ForbiddenException('Sem vínculo com esta empresa.');
  if (vinculo.papel === PapelUsuario.RESPONSAVEL) return;

  const permissoes = (vinculo.permissoes ?? {}) as PermissoesGranulares;
  const nivelUsuario = permissoes[modulo] ?? NivelAcesso.NENHUM;

  if (ORDEM_NIVEL[nivelUsuario] < ORDEM_NIVEL[nivelExigido]) {
    throw new ForbiddenException(`Sem permissão de "${nivelExigido}" no módulo ${modulo}.`);
  }
}
