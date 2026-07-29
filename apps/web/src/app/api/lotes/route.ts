import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as lotesService from '@/server/lotes/lotes.service';
import { CriarLoteDto } from '@/server/lotes/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.VER },
  });
  return lotesService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarLoteDto);
  return lotesService.criar(user.empresaAtivaId!, dto);
});
