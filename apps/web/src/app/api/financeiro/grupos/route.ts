import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as planoContasService from '@/server/financeiro/plano-contas.service';
import { CriarGrupoFinanceiroDto } from '@/server/financeiro/dto/grupo-financeiro.dto';

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarGrupoFinanceiroDto);
  const grupo = await planoContasService.criarGrupo(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.PLANO_CONTAS,
    grupo.id,
    `Grupo ${grupo.codigo} - "${grupo.nome}" cadastrado no plano de contas`,
  );
  return grupo;
});
