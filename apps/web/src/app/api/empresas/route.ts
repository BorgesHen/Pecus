import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as empresasService from '@/server/empresas/empresas.service';
import { CriarEmpresaDto } from '@/server/empresas/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, { semEmpresa: true });
  return empresasService.listar(user.id, user.papelGlobal);
});

// Criar empresa avulsa e vincular usuários a outras fazendas = só ADMIN
export const POST = rota(async (req) => {
  await autorizar(req, { papeis: [PapelUsuario.ADMIN], semEmpresa: true });
  const dto = await validarCorpo(req, CriarEmpresaDto);
  return empresasService.criar(dto);
});
