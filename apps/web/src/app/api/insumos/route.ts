import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as insumosService from '@/server/insumos/insumos.service';
import { CriarInsumoDto } from '@/server/insumos/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.VER },
  });
  return insumosService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarInsumoDto);
  return insumosService.criar(user.empresaAtivaId!, dto);
});
