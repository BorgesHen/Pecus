import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { MoverGadoDto } from '@/server/piquetes/dto';

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, MoverGadoDto);
  const ocupacao = await piquetesService.moverGado(empresaId, params.id, dto);
  await auditar(user, empresaId).movimentacao(
    EntidadeAtividade.PIQUETE,
    params.id,
    `Gado movido para o piquete "${ocupacao.piqueteNome}"`,
    { data: dto.data },
  );
  return ocupacao;
});
