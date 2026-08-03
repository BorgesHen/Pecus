import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as usuariosService from '@/server/usuarios/usuarios.service';

export const POST = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  return usuariosService.resetarSenha(user.empresaAtivaId!, params.usuarioId);
});
