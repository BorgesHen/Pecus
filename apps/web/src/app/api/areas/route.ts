import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as areasService from '@/server/areas/areas.service';
import { CriarAreaDto } from '@/server/areas/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.VER },
  });
  return areasService.listar(user.empresaAtivaId!);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.AREAS, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarAreaDto);
  const area = await areasService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.AREA,
    area.id,
    `Área "${area.nome}" cadastrada com ${area.areaHectares} ha`,
  );
  return area;
});
