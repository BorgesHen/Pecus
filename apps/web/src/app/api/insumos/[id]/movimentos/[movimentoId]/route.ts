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
import * as insumosService from '@/server/insumos/insumos.service';

/**
 * Apaga um movimento de estoque lançado à mão.
 *
 * Quantidade e unidade são digitadas, e um erro de unidade distorce o saldo e o
 * custo médio por um fator de mil (1000 ml lançados como 1000 L). Sem isto o
 * único conserto era mexer no banco.
 *
 * O service recusa movimento vindo de compra ou de aplicação sanitária — nesses
 * casos o dono do registro é o gasto ou o evento.
 */
export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.EDITAR },
  });
  const insumo = await insumosService.detalhar(empresaId, params.id);
  const resultado = await insumosService.removerMovimento(empresaId, params.id, params.movimentoId);

  const legivel = quantidadeLegivel(resultado.quantidade, insumo.unidade);
  const valor = resultado.valorTotal != null ? ` (${brl(resultado.valorTotal)})` : '';
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.INSUMO,
    params.id,
    `Movimento de estoque excluído em "${insumo.nome}": ${resultado.tipo === 'ENTRADA' ? 'entrada' : 'baixa'} de ${formatarQuantidade(legivel.quantidade, legivel.unidade)}${valor}`,
    { movimentoId: params.movimentoId, tipo: resultado.tipo },
  );
  return resultado;
});
