import {
  EntidadeAtividade,
  LABEL_TIPO_EVENTO_SANITARIO,
  ModuloSistema,
  NivelAcesso,
  formatarQuantidade,
  quantidadeLegivel,
} from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import * as sanidadeService from '@/server/sanidade/sanidade.service';
import { AplicarEmMassaDto } from '@/server/sanidade/dto';

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.SANIDADE,
    permissao: { modulo: ModuloSistema.SANIDADE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AplicarEmMassaDto);
  const resultado = await sanidadeService.aplicarEmMassa(empresaId, dto);

  const insumo = resultado.insumo
    ? (() => {
        const total = quantidadeLegivel(resultado.insumo!.quantidadeTotal, resultado.insumo!.unidade);
        const dose = quantidadeLegivel(resultado.insumo!.dosePorAnimal, resultado.insumo!.unidade);
        const valor =
          resultado.insumo!.custoTotal != null
            ? brl(resultado.insumo!.custoTotal)
            : 'sem custo de compra registrado';
        return ` — ${formatarQuantidade(total.quantidade, total.unidade)} de ${resultado.insumo!.nome} (${formatarQuantidade(dose.quantidade, dose.unidade)} por animal, ${valor})`;
      })()
    : '';

  // Sem registroId: a aplicação em massa cria um evento por animal, e nenhum
  // deles é "o" registro da ação.
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.EVENTO_SANITARIO,
    null,
    `${LABEL_TIPO_EVENTO_SANITARIO[dto.tipo]} "${dto.nome}" aplicada em massa em ${resultado.animaisAfetados} animal(is)${insumo}`,
    {
      loteId: dto.loteId ?? null,
      animaisAfetados: resultado.animaisAfetados,
      insumoId: dto.insumoId ?? null,
      custoTotal: resultado.insumo?.custoTotal ?? null,
    },
  );
  return resultado;
});
