import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as empresasService from '@/server/empresas/empresas.service';
import { AtualizarRecursosPersonalizadosDto } from '@/server/empresas/dto';

// Só ADMIN — o responsável da fazenda nem sabe que essa lista existe.
export const PATCH = rota(async (req, { params }) => {
  await autorizar(req, { papeis: [PapelUsuario.ADMIN] });
  const dto = await validarCorpo(req, AtualizarRecursosPersonalizadosDto);
  return empresasService.atualizarRecursosPersonalizados(params.id, dto);
});
