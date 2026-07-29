import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as sanidadeService from '@/server/sanidade/sanidade.service';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.SANIDADE,
    permissao: { modulo: ModuloSistema.SANIDADE, nivel: NivelAcesso.VER },
  });
  const dias = req.nextUrl.searchParams.get('dias');
  return sanidadeService.proximosVencimentos(user.empresaAtivaId!, dias ? Number(dias) : undefined);
});
