import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as convitesService from '@/server/convites/convites.service';

export const DELETE = rota(async (req, { params }) => {
  await autorizar(req, { papeis: [PapelUsuario.ADMIN], semEmpresa: true });
  await convitesService.remover(params.id);
});
