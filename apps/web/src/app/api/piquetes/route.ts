import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { CriarPiqueteDto } from '@/server/piquetes/dto';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.VER },
  });
  const areaId = req.nextUrl.searchParams.get('areaId') ?? '';
  return piquetesService.listarPorArea(user.empresaAtivaId!, areaId);
});

export const POST = rota(async (req) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, CriarPiqueteDto);
  const piquete = await piquetesService.criar(empresaId, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.PIQUETE,
    piquete.id,
    `Piquete "${piquete.nome}" cadastrado`,
    { areaId: dto.areaId },
  );
  return piquete;
});
