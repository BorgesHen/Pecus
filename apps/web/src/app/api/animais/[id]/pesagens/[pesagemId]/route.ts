import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { auditar } from '@/server/atividades/atividades.service';
import * as pesagemAnimalService from '@/server/animais/pesagem-animal.service';

/**
 * Apagar pesagem existe porque peso é digitado à mão na balança: um 4 no lugar
 * do 3 desloca o GMD do animal e não há outra forma de corrigir. A exclusão
 * entra na trilha de atividades com o valor que saiu.
 */
export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await pesagemAnimalService.remover(empresaId, params.id, params.pesagemId);
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.PESAGEM,
    params.pesagemId,
    `Pesagem de ${resultado.peso} kg excluída do animal`,
    { animalId: params.id, data: resultado.data },
  );
  return resultado;
});
