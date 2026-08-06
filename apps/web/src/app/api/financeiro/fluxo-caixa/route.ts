import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as resultado from '@/server/financeiro/resultado.service';

/**
 * Fluxo de caixa mês a mês, por regime de **caixa**: só o liquidado, na data em
 * que foi liquidado. O acumulado parte do saldo inicial dos bancos, então a
 * última linha bate com o saldo atual — dá pra conferir contra o extrato.
 */
export const GET = rota(async (req) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.VER },
  });
  const meses = Number(req.nextUrl.searchParams.get('meses')) || 12;
  return resultado.fluxoDeCaixa(empresaId, Math.min(Math.max(meses, 1), 60));
});
