import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as gastosService from '@/server/gastos/gastos.service';
import { CriarGastoDto } from '@/server/gastos/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.GASTOS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.VER },
  });
  const loteId = req.nextUrl.searchParams.get('loteId') ?? undefined;
  return gastosService.listar(user.empresaAtivaId!, loteId);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.GASTOS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarGastoDto);
  return gastosService.criar(user.empresaAtivaId!, dto);
});
