import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as planoContasService from '@/server/financeiro/plano-contas.service';
import { CriarContaFinanceiraDto } from '@/server/financeiro/dto/conta-financeira.dto';

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarContaFinanceiraDto);
  return planoContasService.criarConta(user.empresaAtivaId!, dto);
});
