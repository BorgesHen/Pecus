import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { RegistrarAlturaDto } from '@/server/piquetes/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.VER },
  });
  return piquetesService.listarAlturas(user.empresaAtivaId!, params.id);
});

export const POST = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, RegistrarAlturaDto);
  return piquetesService.registrarAltura(user.empresaAtivaId!, params.id, dto);
});
