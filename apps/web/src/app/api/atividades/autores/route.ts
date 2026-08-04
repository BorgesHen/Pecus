import { PapelUsuario } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as atividadesService from '@/server/atividades/atividades.service';

/**
 * Quem aparece no histórico da fazenda, pro filtro "feito por" da tela de
 * Atividades. Sai do próprio log (e não da lista de usuários) porque quem já
 * saiu da fazenda também precisa continuar filtrável.
 */
export const GET = rota(async (req) => {
  const { empresaId } = await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });
  return atividadesService.autores(empresaId);
});
