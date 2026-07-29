import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as lotesService from '@/server/lotes/lotes.service';
import { TrocarMetodoLoteDto } from '@/server/lotes/dto';

export const POST = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, TrocarMetodoLoteDto);
  return lotesService.trocarMetodo(user.empresaAtivaId!, params.id, dto);
});
