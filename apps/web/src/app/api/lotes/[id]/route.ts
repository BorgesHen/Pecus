import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as lotesService from '@/server/lotes/lotes.service';
import { AtualizarLoteDto } from '@/server/lotes/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.VER },
  });
  return lotesService.detalhar(user.empresaAtivaId!, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarLoteDto);
  return lotesService.atualizar(user.empresaAtivaId!, params.id, dto);
});

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  return lotesService.remover(user.empresaAtivaId!, params.id);
});
