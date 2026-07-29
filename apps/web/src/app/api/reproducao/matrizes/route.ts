import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as reproducaoService from '@/server/reproducao/reproducao.service';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.REPRODUCAO,
    permissao: { modulo: ModuloSistema.REPRODUCAO, nivel: NivelAcesso.VER },
  });
  return reproducaoService.listarMatrizes(user.empresaAtivaId!);
});
