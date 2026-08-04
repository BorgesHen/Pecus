import { BadRequestException } from '@nestjs/common';
import {
  MODULO_DA_ENTIDADE,
  NivelAcesso,
  PapelUsuario,
  ehAcaoAtividade,
  ehEntidadeAtividade,
  type AcaoAtividade,
  type EntidadeAtividade,
} from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import * as atividadesService from '@/server/atividades/atividades.service';

/**
 * Histórico de atividades da fazenda.
 *
 * A autorização depende do que se está pedindo:
 *
 * - **Feed geral** (sem `entidade`): junta tudo, inclusive usuários e
 *   configurações, então fica restrito ao responsável (e ao ADMIN, que passa
 *   por qualquer checagem de papel).
 * - **Histórico de um módulo** (`entidade`, opcionalmente com `registroId`):
 *   quem já pode VER aquela tela pode ver o histórico dela. É o que sustenta o
 *   botão "Histórico" espalhado pelo sistema.
 *
 * Não checa `moduloAtivo` de propósito: desligar um módulo esconde a tela, mas
 * não deve apagar da vista o que já foi feito enquanto ele estava em uso.
 */
export const GET = rota(async (req) => {
  const params = req.nextUrl.searchParams;

  let entidade: EntidadeAtividade | undefined;
  const entidadeParam = params.get('entidade');
  if (entidadeParam) {
    if (!ehEntidadeAtividade(entidadeParam)) {
      throw new BadRequestException('Módulo inválido para o histórico.');
    }
    entidade = entidadeParam;
  }

  let acao: AcaoAtividade | undefined;
  const acaoParam = params.get('acao');
  if (acaoParam) {
    if (!ehAcaoAtividade(acaoParam)) {
      throw new BadRequestException('Tipo de ação inválido para o histórico.');
    }
    acao = acaoParam;
  }

  const modulo = entidade ? MODULO_DA_ENTIDADE[entidade] : null;
  const { empresaId } = modulo
    ? await autorizar(req, { permissao: { modulo, nivel: NivelAcesso.VER } })
    : await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });

  return atividadesService.listar(empresaId, {
    entidade,
    acao,
    registroId: params.get('registroId') ?? undefined,
    autorId: params.get('autorId') ?? undefined,
    de: params.get('de') ?? undefined,
    ate: params.get('ate') ?? undefined,
    busca: params.get('busca') ?? undefined,
    pagina: Number(params.get('pagina')) || 1,
    porPagina: Number(params.get('porPagina')) || undefined,
  });
});
