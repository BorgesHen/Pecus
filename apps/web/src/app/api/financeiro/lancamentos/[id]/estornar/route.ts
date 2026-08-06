import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import * as lancamentosService from '@/server/financeiro/lancamentos.service';

/**
 * Estorna a liquidação: o lançamento volta pra "em aberto".
 *
 * Liquidar errado só tinha saída excluindo a parcela. O dinheiro sai do saldo do
 * banco na mesma hora, porque o saldo conta só o que está liquidado.
 */
export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const lancamento = await lancamentosService.estornarLiquidacao(empresaId, params.id);
  await auditar(user, empresaId).movimentacao(
    EntidadeAtividade.LANCAMENTO,
    params.id,
    `Liquidação estornada: ${brl(lancamento.valorParcela)} voltou para "em aberto" (estava liquidado em ${lancamento.liquidacaoEstornada})`,
  );
  return lancamento;
});
