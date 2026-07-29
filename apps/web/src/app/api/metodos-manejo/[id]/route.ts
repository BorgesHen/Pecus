import { ModuloSistema, PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as metodosManejoService from '@/server/metodos-manejo/metodos-manejo.service';

export const DELETE = rota(async (req, { params }) => {
  const { user } = await autorizar(req, {
    papeis: [PapelUsuario.RESPONSAVEL],
    moduloAtivo: ModuloSistema.METODOS_MANEJO,
  });
  return metodosManejoService.remover(user.empresaAtivaId!, params.id);
});
