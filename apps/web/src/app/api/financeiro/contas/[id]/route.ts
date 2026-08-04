import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as planoContasService from '@/server/financeiro/plano-contas.service';
import { AtualizarContaFinanceiraDto } from '@/server/financeiro/dto/conta-financeira.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarContaFinanceiraDto);
  const conta = await planoContasService.atualizarConta(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.PLANO_CONTAS,
    conta.id,
    `Conta ${conta.codigo} - "${conta.nome}" editada`,
    { camposAlterados: Object.keys(dto) },
  );
  return conta;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await planoContasService.removerConta(empresaId, params.id);
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.PLANO_CONTAS,
    params.id,
    `Conta ${resultado.codigo} - "${resultado.nome}" excluída do plano de contas`,
  );
  return resultado;
});
