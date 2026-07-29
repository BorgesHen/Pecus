import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as empresasService from '@/server/empresas/empresas.service';
import { AtualizarEmpresaDto } from '@/server/empresas/dto';

export const GET = rota(async (req, { params }) => {
  await autorizar(req);
  return empresasService.detalhar(params.id);
});

// Editar dados da própria fazenda: responsável pode
export const PATCH = rota(async (req, { params }) => {
  await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  const dto = await validarCorpo(req, AtualizarEmpresaDto);
  return empresasService.atualizar(params.id, dto);
});
