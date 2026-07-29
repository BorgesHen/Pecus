import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { MoverGadoDto } from '@/server/piquetes/dto';

export const POST = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, MoverGadoDto);
  return piquetesService.moverGado(user.empresaAtivaId!, params.id, dto);
});
