import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as insumosService from '@/server/insumos/insumos.service';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.VER },
  });
  return insumosService.listarMovimentos(user.empresaAtivaId!, params.id);
});
