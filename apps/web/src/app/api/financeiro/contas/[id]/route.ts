import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as planoContasService from '@/server/financeiro/plano-contas.service';
import { AtualizarContaFinanceiraDto } from '@/server/financeiro/dto/conta-financeira.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarContaFinanceiraDto);
  return planoContasService.atualizarConta(user.empresaAtivaId!, params.id, dto);
});

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  return planoContasService.removerConta(user.empresaAtivaId!, params.id);
});
