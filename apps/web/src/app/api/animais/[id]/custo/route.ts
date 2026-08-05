import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as custoAnimalService from '@/server/animais/custo-animal.service';

/**
 * Custo de produção do animal.
 *
 * Módulo ativo é Animais (é onde a tela vive), mas a permissão exigida é a de
 * **Gastos**: a resposta é dinheiro — compra do lote, rateio das despesas e o
 * custo dos insumos aplicados. Quem não pode ver os gastos da fazenda não pode
 * vê-los divididos por cabeça. Mesmo par que as pesagens do animal fazem com
 * Animais/Pesagens.
 */
export const GET = rota(async (req, { params }) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ANIMAIS,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.VER },
  });
  return custoAnimalService.custoDoAnimal(empresaId, params.id);
});
