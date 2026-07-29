import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as sanidadeService from '@/server/sanidade/sanidade.service';
import { AplicarEmMassaDto } from '@/server/sanidade/dto';

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.SANIDADE,
    permissao: { modulo: ModuloSistema.SANIDADE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AplicarEmMassaDto);
  return sanidadeService.aplicarEmMassa(user.empresaAtivaId!, dto);
});
