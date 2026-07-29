import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { AtualizarPiqueteDto } from '@/server/piquetes/dto';

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarPiqueteDto);
  return piquetesService.atualizar(user.empresaAtivaId!, params.id, dto);
});

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  return piquetesService.remover(user.empresaAtivaId!, params.id);
});
