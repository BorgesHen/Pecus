import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as usuariosService from '@/server/usuarios/usuarios.service';

// @Roles() vazio no original — sem restrição de papel, só autenticação.
export const GET = rota(async (req) => {
  const { user } = await autorizar(req);
  return usuariosService.obterMinhasPermissoes(user.empresaAtivaId!, user.id, user.papelGlobal);
});
