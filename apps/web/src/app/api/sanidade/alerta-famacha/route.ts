import { ModuloSistema, NivelAcesso, RECURSO_OVINOS } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { garantirRecurso } from '@/server/recursos';
import * as sanidadeService from '@/server/sanidade/sanidade.service';

export const GET = rota(async (req) => {
  const { user } = await autorizar(req, {
    moduloAtivo: ModuloSistema.SANIDADE,
    permissao: { modulo: ModuloSistema.SANIDADE, nivel: NivelAcesso.VER },
  });
  await garantirRecurso(
    user.empresaAtivaId!,
    RECURSO_OVINOS,
    'O recurso de ovinos não está liberado para esta fazenda.',
  );
  return sanidadeService.alertaFamacha(user.empresaAtivaId!);
});
