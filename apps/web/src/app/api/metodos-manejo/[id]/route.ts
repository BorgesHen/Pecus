import { EntidadeAtividade, ModuloSistema, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar } from '@/server/atividades/atividades.service';
import * as metodosManejoService from '@/server/metodos-manejo/metodos-manejo.service';

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    papeis: [PapelUsuario.RESPONSAVEL],
    moduloAtivo: ModuloSistema.METODOS_MANEJO,
  });
  const resultado = await metodosManejoService.remover(empresaId, params.id);
  // Nome nulo = método que não era desta fazenda (ou já não existia): nada foi
  // apagado, então nada entra no histórico.
  if (resultado.nome) {
    await auditar(user, empresaId).exclusao(
      EntidadeAtividade.METODO_MANEJO,
      params.id,
      `Método de manejo "${resultado.nome}" excluído`,
    );
  }
  return resultado;
});
