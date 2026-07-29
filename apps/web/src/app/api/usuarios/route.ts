import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as usuariosService from '@/server/usuarios/usuarios.service';
import { CriarUsuarioDto } from '@/server/usuarios/dto';

const PAPEIS_GESTAO = [PapelUsuario.RESPONSAVEL];

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  return usuariosService.listarDaEmpresa(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, { papeis: PAPEIS_GESTAO });
  const dto = await validarCorpo(req, CriarUsuarioDto);
  return usuariosService.criarNaEmpresa(user.empresaAtivaId!, dto);
});
