import {
  EntidadeAtividade,
  ModuloSistema,
  NivelAcesso,
  formatarQuantidade,
  quantidadeLegivel,
} from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import * as gastosService from '@/server/gastos/gastos.service';

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.GASTOS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await gastosService.remover(empresaId, params.id);
  // `gasto` nulo = id que não existia mais; nesse caso nada aconteceu de fato,
  // então nada vai pro histórico.
  if (resultado.gasto) {
    // A entrada de estoque desfeita entra na descrição: sem isso, o saldo do
    // insumo cairia sem nenhuma linha no histórico explicando por quê.
    let estoque = '';
    if (resultado.estoque) {
      const legivel = quantidadeLegivel(resultado.estoque.quantidadeDesfeita, resultado.estoque.unidade);
      estoque = ` — desfeita a entrada de ${formatarQuantidade(legivel.quantidade, legivel.unidade)} de "${resultado.estoque.insumo}"`;
    }
    await auditar(user, empresaId).exclusao(
      EntidadeAtividade.GASTO,
      params.id,
      `Gasto de ${brl(resultado.gasto.valor)} em "${resultado.gasto.categoria}" excluído${estoque}`,
      resultado.estoque ? { saldoDepois: resultado.estoque.saldoDepois } : undefined,
    );
  }
  return resultado;
});
