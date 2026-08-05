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
import { autorizar, temPermissao } from '@/server/autorizar';
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
 * - **Histórico de vários módulos** (`entidade=animal,pesagem`): a tela do
 *   animal junta o que foi alterado nele com as pesagens dele. A primeira
 *   entidade é a da tela e manda na autorização; as demais entram só se a
 *   pessoa também puder ver aquele módulo (ver abaixo).
 *
 * Não checa `moduloAtivo` de propósito: desligar um módulo esconde a tela, mas
 * não deve apagar da vista o que já foi feito enquanto ele estava em uso.
 */
export const GET = rota(async (req) => {
  const params = req.nextUrl.searchParams;

  const entidades: EntidadeAtividade[] = [];
  const entidadeParam = params.get('entidade');
  if (entidadeParam) {
    for (const valor of entidadeParam.split(',')) {
      const bruto = valor.trim();
      if (!bruto) continue;
      if (!ehEntidadeAtividade(bruto)) {
        throw new BadRequestException('Módulo inválido para o histórico.');
      }
      if (!entidades.includes(bruto)) entidades.push(bruto);
    }
  }

  let acao: AcaoAtividade | undefined;
  const acaoParam = params.get('acao');
  if (acaoParam) {
    if (!ehAcaoAtividade(acaoParam)) {
      throw new BadRequestException('Tipo de ação inválido para o histórico.');
    }
    acao = acaoParam;
  }

  // A primeira entidade é a da tela: é ela que decide se a pessoa entra.
  const principal = entidades[0];
  const modulo = principal ? MODULO_DA_ENTIDADE[principal] : null;
  const { user, empresaId } = modulo
    ? await autorizar(req, { permissao: { modulo, nivel: NivelAcesso.VER } })
    : await autorizar(req, { papeis: [PapelUsuario.RESPONSAVEL] });

  // As entidades extras são descartadas quando a pessoa não tem o módulo, em
  // vez de negar a requisição inteira: quem tem Animais mas não Pesagens
  // continua vendo o histórico do animal, só sem as linhas de pesagem — a
  // mesma regra que esconde peso e GMD da listagem de animais. Negar tudo
  // tiraria dessa pessoa um histórico que ela pode ver.
  const permitidas: EntidadeAtividade[] = [];
  for (const extra of entidades.slice(1)) {
    const moduloExtra = MODULO_DA_ENTIDADE[extra];
    // Entidade sem módulo (usuários, configurações) é restrita ao responsável e
    // não faz sentido como complemento de uma tela de detalhe.
    if (!moduloExtra) throw new BadRequestException('Módulo inválido para o histórico combinado.');
    if (await temPermissao(user, moduloExtra, NivelAcesso.VER)) permitidas.push(extra);
  }

  return atividadesService.listar(empresaId, {
    entidade: principal ? [principal, ...permitidas] : undefined,
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
