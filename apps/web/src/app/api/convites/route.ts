import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as convitesService from '@/server/convites/convites.service';
import { CriarConviteDto } from '@/server/convites/dto';

export const GET = rota(async (req) => {
  await autorizar(req, { papeis: [PapelUsuario.ADMIN] });
  return convitesService.listar();
});

export const POST = rota(async (req) => {
  await autorizar(req, { papeis: [PapelUsuario.ADMIN] });
  const dto = await validarCorpo(req, CriarConviteDto);
  return convitesService.criar(dto);
});
