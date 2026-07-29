import { ModuloSistema, NivelAcesso, type StatusAnimal } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as animaisService from '@/server/animais/animais.service';
import { CriarAnimalDto } from '@/server/animais/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.VER },
  });
  const loteId = req.nextUrl.searchParams.get('loteId') ?? undefined;
  const status = (req.nextUrl.searchParams.get('status') as StatusAnimal | null) ?? undefined;
  return animaisService.listar(user.empresaAtivaId!, { loteId, status });
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarAnimalDto);
  return animaisService.criar(user.empresaAtivaId!, dto);
});
