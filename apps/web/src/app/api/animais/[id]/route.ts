import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as animaisService from '@/server/animais/animais.service';
import { AtualizarAnimalDto } from '@/server/animais/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.VER },
  });
  return animaisService.detalhar(user.empresaAtivaId!, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarAnimalDto);
  return animaisService.atualizar(user.empresaAtivaId!, params.id, dto);
});
