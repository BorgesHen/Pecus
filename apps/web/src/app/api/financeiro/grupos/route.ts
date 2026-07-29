import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import * as planoContasService from '@/server/financeiro/plano-contas.service';
import { CriarGrupoFinanceiroDto } from '@/server/financeiro/dto/grupo-financeiro.dto';

export const POST = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarGrupoFinanceiroDto);
  return planoContasService.criarGrupo(user.empresaAtivaId!, dto);
});
