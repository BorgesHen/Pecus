import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as abateService from '@/server/animais/abate.service';

/**
 * Rendimento realizado do lote: carcaça total ÷ peso vivo total dos animais
 * abatidos, ao lado da estimativa que o lote usava.
 *
 * Permissão de Animais (é a origem do dado) sob o módulo Lotes, que é onde a
 * tela vive — mesmo par que a cobertura do lote faz com Pesagens/Sanidade.
 */
export const GET = rota(async (req, { params }) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.ANIMAIS, nivel: NivelAcesso.VER },
  });
  return abateService.abateDoLote(empresaId, params.id);
});
