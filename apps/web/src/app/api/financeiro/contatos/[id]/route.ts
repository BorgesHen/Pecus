import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as contatosService from '@/server/financeiro/contatos.service';
import { AtualizarContatoDto } from '@/server/financeiro/dto/contato.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarContatoDto);
  return contatosService.atualizar(user.empresaAtivaId!, params.id, dto);
});

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  return contatosService.remover(user.empresaAtivaId!, params.id);
});
