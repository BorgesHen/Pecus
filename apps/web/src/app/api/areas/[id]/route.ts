import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as areasService from '@/server/areas/areas.service';
import { AtualizarAreaDto } from '@/server/areas/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.VER },
  });
  return areasService.detalhar(user.empresaAtivaId!, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarAreaDto);
  return areasService.atualizar(user.empresaAtivaId!, params.id, dto);
});

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.EDITAR },
  });
  return areasService.remover(user.empresaAtivaId!, params.id);
});
