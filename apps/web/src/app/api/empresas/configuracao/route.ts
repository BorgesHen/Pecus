import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as empresasService from '@/server/empresas/empresas.service';
import { AtualizarConfiguracaoEmpresaDto } from '@/server/empresas/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req);
  return empresasService.obterConfiguracao(user.empresaAtivaId!);
});

export const PATCH = rota(async (req) => {
  const { user } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  const dto = await validarCorpo(req, AtualizarConfiguracaoEmpresaDto);
  return empresasService.atualizarConfiguracao(user.empresaAtivaId!, dto);
});
