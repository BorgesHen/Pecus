import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as pesagensService from '@/server/pesagens/pesagens.service';

export const GET = rota(async (req, { params }) => {
  const { user } = await autorizar(req, { permissao: { modulo: ModuloSistema.PESAGENS, nivel: NivelAcesso.VER } });
  return pesagensService.gmd(user.empresaAtivaId!, params.loteId);
});
