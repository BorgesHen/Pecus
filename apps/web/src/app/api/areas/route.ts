import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as areasService from '@/server/areas/areas.service';
import { CriarAreaDto } from '@/server/areas/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.VER },
  });
  return areasService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarAreaDto);
  return areasService.criar(user.empresaAtivaId!, dto);
});
