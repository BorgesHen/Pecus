import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as empresasService from '@/server/empresas/empresas.service';

export const POST = rota(async (req, { params }) => {
  await autorizar(req, { papeis: [PapelUsuario.ADMIN], semEmpresa: true });
  const body = (await req.json()) as { usuarioId: string; papel: PapelUsuario };
  return empresasService.vincularUsuario(params.id, body.usuarioId, body.papel);
});
