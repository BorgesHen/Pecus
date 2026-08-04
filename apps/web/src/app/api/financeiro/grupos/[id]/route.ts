import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as planoContasService from '@/server/financeiro/plano-contas.service';
import { AtualizarGrupoFinanceiroDto } from '@/server/financeiro/dto/grupo-financeiro.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarGrupoFinanceiroDto);
  const grupo = await planoContasService.atualizarGrupo(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.PLANO_CONTAS,
    grupo.id,
    `Grupo ${grupo.codigo} - "${grupo.nome}" editado`,
    { camposAlterados: Object.keys(dto) },
  );
  return grupo;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await planoContasService.removerGrupo(empresaId, params.id);
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.PLANO_CONTAS,
    params.id,
    `Grupo ${resultado.codigo} - "${resultado.nome}" excluído do plano de contas`,
  );
  return resultado;
});
