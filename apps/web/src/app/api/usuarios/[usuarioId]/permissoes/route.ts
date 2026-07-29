import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as usuariosService from '@/server/usuarios/usuarios.service';
import { AtualizarPermissoesDto } from '@/server/usuarios/dto';

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  const dto = await validarCorpo(req, AtualizarPermissoesDto);
  return usuariosService.atualizarPermissoes(user.empresaAtivaId!, params.usuarioId, dto);
});
