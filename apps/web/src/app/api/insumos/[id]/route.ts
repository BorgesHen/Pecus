import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as insumosService from '@/server/insumos/insumos.service';
import { AtualizarInsumoDto } from '@/server/insumos/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.VER },
  });
  return insumosService.detalhar(user.empresaAtivaId!, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarInsumoDto);
  return insumosService.atualizar(user.empresaAtivaId!, params.id, dto);
});
