import { ModuloSistema, NivelAcesso } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar, temPermissao } from '@/server/autorizar';
import * as coberturaService from '@/server/lotes/cobertura.service';

/**
 * Acompanhamento do lote: rebanho, quem falta pesar e quem falta no manejo
 * sanitário.
 *
 * Quem vê o lote vê o bloco de rebanho (é contagem de animais, informação da
 * própria tela de Lotes). Os blocos de pesagem e de sanidade só vão na resposta
 * pra quem tem o módulo correspondente — mesma regra que já esconde peso e GMD
 * da listagem de animais: a resposta muda de forma pela permissão, em vez de
 * negar a tela inteira a quem pode vê-la.
 */
export const GET = rota(async (req, { params }) => {
  const { user, empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.LOTES, nivel: NivelAcesso.VER },
  });

  const [completo, vePesagens, veSanidade] = await Promise.all([
    coberturaService.cobertura(empresaId, params.id),
    temPermissao(user, ModuloSistema.PESAGENS, NivelAcesso.VER),
    temPermissao(user, ModuloSistema.SANIDADE, NivelAcesso.VER),
  ]);

  return {
    ...completo,
    pesagem: vePesagens ? completo.pesagem : null,
    sanidade: veSanidade ? completo.sanidade : null,
  };
});
