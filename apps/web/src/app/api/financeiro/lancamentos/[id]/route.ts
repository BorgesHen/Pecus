import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import { validarCorpo } from '@/server/validar';
import * as lancamentosService from '@/server/financeiro/lancamentos.service';
import { AtualizarLancamentoDto } from '@/server/financeiro/dto/lancamento.dto';

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

/**
 * Edita um lançamento. Faltava, e corrigir um valor obrigava a excluir e
 * relançar — perdendo o histórico e, num parcelado, a série inteira.
 */
export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarLancamentoDto);
  const lancamento = await lancamentosService.atualizar(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.LANCAMENTO,
    params.id,
    `Lançamento de ${brl(Number(lancamento.valorParcela))} editado`,
    { camposAlterados: Object.keys(dto) },
  );
  return lancamento;
});
