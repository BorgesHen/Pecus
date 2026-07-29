import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as animaisService from '@/server/animais/animais.service';
import { DarSaidaAnimalDto } from '@/server/animais/dto';

export const POST = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, DarSaidaAnimalDto);
  return animaisService.darSaida(user.empresaAtivaId!, params.id, dto);
});
