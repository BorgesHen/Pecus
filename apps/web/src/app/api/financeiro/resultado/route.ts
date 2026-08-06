import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as resultado from '@/server/financeiro/resultado.service';

/**
 * Resultado do período por grupo do plano de contas — o DRE.
 *
 * Por **competência**, incluindo o que ainda não foi pago: é o resultado do
 * período, não o extrato. Os grupos do plano existiam no banco e nenhuma tela
 * somava por eles até aqui.
 */
export const GET = rota(async (req) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.VER },
  });
  const p = req.nextUrl.searchParams;
  return resultado.resultadoPorGrupo(empresaId, {
    de: p.get('de') ?? undefined,
    ate: p.get('ate') ?? undefined,
    loteId: p.get('loteId') ?? undefined,
  });
});
