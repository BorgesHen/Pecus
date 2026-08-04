import { EntidadeAtividade, ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { validarCorpo } from '@/server/validar';
import { auditar } from '@/server/atividades/atividades.service';
import * as piquetesService from '@/server/piquetes/piquetes.service';
import { RegistrarAlturaDto } from '@/server/piquetes/dto';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.VER },
  });
  return piquetesService.listarAlturas(user.empresaAtivaId!, params.id);
});

export const POST = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.AREAS,
    permissao: { modulo: ModuloSistema.PIQUETES, nivel: NivelAcesso.EDITAR },
  });
  const dto = await validarCorpo(req, RegistrarAlturaDto);
  const registro = await piquetesService.registrarAltura(empresaId, params.id, dto);
  await auditar(user, empresaId).criacao(
    EntidadeAtividade.PIQUETE,
    params.id,
    `Altura do pasto no piquete "${registro.piqueteNome}": ${registro.alturaCm} cm`,
  );
  return registro;
});
