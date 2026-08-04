import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
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
    await auditar(user, empresaId).exclusao(
      EntidadeAtividade.GASTO,
      params.id,
      `Gasto de ${brl(resultado.gasto.valor)} em "${resultado.gasto.categoria}" excluído`,
    );
  }
  return resultado;
});
