import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as resultado from '@/server/financeiro/resultado.service';

/**
 * Saldo de cada conta bancária: saldo inicial mais o que foi liquidado nela.
 *
 * `saldoInicial` estava gravado e nenhuma linha de código o lia — o banco era uma
 * etiqueta no lançamento, não uma conta com saldo.
 */
export const GET = rota(async (req) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.FINANCEIRO,
    permissao: { modulo: ModuloSistema.FINANCEIRO, nivel: NivelAcesso.VER },
  });
  return resultado.saldosBancarios(empresaId);
});
