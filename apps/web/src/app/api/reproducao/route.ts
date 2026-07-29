import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as reproducaoService from '@/server/reproducao/reproducao.service';
import { CriarEventoReprodutivoDto } from '@/server/reproducao/dto';

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.REPRODUCAO,
    permissao: { modulo: ModuloSistema.REPRODUCAO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarEventoReprodutivoDto);
  return reproducaoService.criar(user.empresaAtivaId!, dto);
});
