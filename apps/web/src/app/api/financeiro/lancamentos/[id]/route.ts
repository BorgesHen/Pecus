import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import * as lancamentosService from '@/server/financeiro/lancamentos.service';

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await lancamentosService.remover(empresaId, params.id);
  const { descricao, valorParcela, numeroParcela, totalParcelas } = resultado.lancamento;
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.LANCAMENTO,
    params.id,
    `Lançamento "${descricao ?? 'sem descrição'}" (parcela ${numeroParcela}/${totalParcelas}, ${brl(valorParcela)}) excluído`,
  );
  return resultado;
});
