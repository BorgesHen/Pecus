import {
  EntidadeAtividade,
  ModuloSistema,
  NivelAcesso,
  formatarQuantidade,
  quantidadeLegivel,
} from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar, brl } from '@/server/atividades/atividades.service';
import * as insumosService from '@/server/insumos/insumos.service';
import { RegistrarEntradaDto } from '@/server/insumos/dto';

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, RegistrarEntradaDto);
  const movimento = await insumosService.registrarEntrada(empresaId, params.id, dto);
  const legivel = quantidadeLegivel(movimento.quantidade, movimento.insumo.unidade);
  const valor = movimento.valorTotal != null ? ` por ${brl(movimento.valorTotal)}` : '';
  await auditar(user, empresaId).movimentacao(
    EntidadeAtividade.INSUMO,
    params.id,
    `Entrada de ${formatarQuantidade(legivel.quantidade, legivel.unidade)} de "${movimento.insumo.nome}"${valor}`,
    { observacao: dto.observacao ?? null, valorTotal: dto.valorTotal ?? null },
  );
  return movimento;
});
