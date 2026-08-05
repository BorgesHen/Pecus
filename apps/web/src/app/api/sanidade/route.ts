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
import { CriarEventoSanitarioDto } from '@/server/sanidade/dto';

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.SANIDADE,
    permissao: { modulo: ModuloSistema.SANIDADE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarEventoSanitarioDto);
  const evento = await sanidadeService.criar(empresaId, dto);

  // O insumo aplicado entra na descrição porque é ele que move estoque e
  // dinheiro: "Vacina X no animal 123" não deixa rastro de que 5 ml saíram do
  // frasco e R$ 5,00 foram para o custo daquele bicho.
  const insumo =
    evento.insumoNome && evento.quantidadeInsumo != null
      ? (() => {
          // A quantidade está gravada na unidade de cadastro (0,005 L). Volta pra
          // unidade que se lê antes de entrar na descrição.
          const legivel = quantidadeLegivel(evento.quantidadeInsumo, evento.insumoUnidade);
          const valor = evento.custo != null ? brl(Number(evento.custo)) : 'sem custo de compra registrado';
          return ` — ${formatarQuantidade(legivel.quantidade, legivel.unidade)} de ${evento.insumoNome} (${valor})`;
        })()
      : '';

  await auditar(user, empresaId).noContexto(evento.animalId).criacao(
    EntidadeAtividade.EVENTO_SANITARIO,
    evento.id,
    `${LABEL_TIPO_EVENTO_SANITARIO[evento.tipo]} "${evento.nome}" no animal ${evento.animalIdentificador}${insumo}`,
    {
      animalId: evento.animalId,
      insumoId: evento.insumoId ?? null,
      quantidadeInsumo: evento.quantidadeInsumo ?? null,
      custo: evento.custo == null ? null : Number(evento.custo),
    },
  );
  return evento;
});
