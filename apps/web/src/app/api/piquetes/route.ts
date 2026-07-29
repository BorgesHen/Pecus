import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { CriarPiqueteDto } from '@/server/piquetes/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.VER },
  });
  const areaId = req.nextUrl.searchParams.get('areaId') ?? '';
  return piquetesService.listarPorArea(user.empresaAtivaId!, areaId);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarPiqueteDto);
  return piquetesService.criar(user.empresaAtivaId!, dto);
});
