import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as usuariosService from '@/server/usuarios/usuarios.service';
import { AtualizarUsuarioDto } from '@/server/usuarios/dto';

const PAPEIS_GESTAO = [PapelUsuario.RESPONSAVEL];

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  const dto = await validarCorpo(req, AtualizarUsuarioDto);
  return usuariosService.atualizarInfo(user.empresaAtivaId!, params.usuarioId, dto);
});

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  return usuariosService.removerDaEmpresa(user.empresaAtivaId!, params.usuarioId);
});
