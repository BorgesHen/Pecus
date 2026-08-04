import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { AtualizarPiqueteDto } from '@/server/piquetes/dto';

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarPiqueteDto);
  const piquete = await piquetesService.atualizar(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(
    EntidadeAtividade.PIQUETE,
    piquete.id,
    `Piquete "${piquete.nome}" editado`,
    { camposAlterados: Object.keys(dto) },
  );
  return piquete;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await piquetesService.remover(empresaId, params.id);
  await auditar(user, empresaId).exclusao(
    EntidadeAtividade.PIQUETE,
    params.id,
    `Piquete "${resultado.nome}" excluído`,
  );
  return resultado;
});
