import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as gastosService from '@/server/gastos/gastos.service';

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.GASTOS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.EDITAR },
  });
  return gastosService.remover(user.empresaAtivaId!, params.id);
});
