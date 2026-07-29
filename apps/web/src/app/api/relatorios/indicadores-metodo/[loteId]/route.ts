import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as relatoriosService from '@/server/relatorios/relatorios.service';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.RELATORIOS,
    permissao: { modulo: ModuloSistema.RELATORIOS, nivel: NivelAcesso.VER },
  });
  return relatoriosService.indicadoresMetodo(user.empresaAtivaId!, params.loteId);
});
