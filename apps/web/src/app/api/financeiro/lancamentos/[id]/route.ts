import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as lancamentosService from '@/server/financeiro/lancamentos.service';

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  return lancamentosService.remover(user.empresaAtivaId!, params.id);
});
