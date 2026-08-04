import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import * as lancamentosService from '@/server/financeiro/lancamentos.service';
import { LiquidarLancamentoDto } from '@/server/financeiro/dto/lancamento.dto';

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, LiquidarLancamentoDto);
  const lancamento = await lancamentosService.liquidar(empresaId, params.id, dto);
  // Liquidar é dinheiro que entrou ou saiu de fato: movimentação, não edição.
  await auditar(user, empresaId).movimentacao(
    EntidadeAtividade.LANCAMENTO,
    lancamento.id,
    `Parcela ${lancamento.numeroParcela}/${lancamento.totalParcelas} de "${lancamento.descricao ?? 'sem descrição'}" liquidada (${brl(Number(lancamento.valorParcela))})`,
    { dataLiquidacao: dto.dataLiquidacao, contaBancariaId: dto.contaBancariaId ?? null },
  );
  return lancamento;
});
