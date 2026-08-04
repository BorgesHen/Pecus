import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as lotesService from '@/server/lotes/lotes.service';
import { TrocarMetodoLoteDto } from '@/server/lotes/dto';

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, TrocarMetodoLoteDto);
  const lote = await lotesService.trocarMetodo(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.LOTE,
    lote.id,
    `Lote "${lote.identificacao}" passou para o método "${lote.metodoManejo?.nome ?? 'sem método'}"`,
    { dataTroca: dto.dataTroca },
  );
  return lote;
});
