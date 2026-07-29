import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as gastosService from '@/server/gastos/gastos.service';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.GASTOS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.VER },
  });
  const loteId = req.nextUrl.searchParams.get('loteId') ?? undefined;
  return gastosService.totalPorCategoria(user.empresaAtivaId!, loteId);
});
