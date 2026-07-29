import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as insumosService from '@/server/insumos/insumos.service';
import { RegistrarConsumoDto } from '@/server/insumos/dto';

export const POST = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, RegistrarConsumoDto);
  return insumosService.registrarConsumo(user.empresaAtivaId!, params.id, dto);
});
