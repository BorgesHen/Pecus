import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as areasService from '@/server/areas/areas.service';
import { AtualizarAreaDto } from '@/server/areas/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.VER },
  });
  return areasService.detalhar(user.empresaAtivaId!, params.id);
});

export const PATCH = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, AtualizarAreaDto);
  const area = await areasService.atualizar(empresaId, params.id, dto);
  await auditar(user, empresaId).atualizacao(EntidadeAtividade.AREA, area.id, `Área "${area.nome}" editada`, {
    camposAlterados: Object.keys(dto),
  });
  return area;
});

export const DELETE = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.EDITAR },
  });
  const resultado = await areasService.remover(empresaId, params.id);
  await auditar(user, empresaId).exclusao(EntidadeAtividade.AREA, params.id, `Área "${resultado.nome}" excluída`);
  return resultado;
});
