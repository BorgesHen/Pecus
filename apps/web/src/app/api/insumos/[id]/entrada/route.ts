import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as insumosService from '@/server/insumos/insumos.service';
import { RegistrarEntradaDto } from '@/server/insumos/dto';

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.ESTOQUE,
    permissao: { modulo: ModuloSistema.ESTOQUE, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, RegistrarEntradaDto);
  const movimento = await insumosService.registrarEntrada(empresaId, params.id, dto);
  await auditar(user, empresaId).movimentacao(
    EntidadeAtividade.INSUMO,
    params.id,
    `Entrada de ${movimento.quantidade} ${movimento.insumo.unidade} de "${movimento.insumo.nome}"`,
    { observacao: dto.observacao ?? null },
  );
  return movimento;
});
