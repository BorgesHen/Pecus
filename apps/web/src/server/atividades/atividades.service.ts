import {
  AcaoAtividade,
  EntidadeAtividade,
  type UsuarioAutenticado,
} from '@pecus/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

/** Teto de itens por página — evita que `porPagina=99999` puxe o log inteiro. */
const POR_PAGINA_MAX = 200;
const POR_PAGINA_PADRAO = 50;

/**
 * Só a identidade de quem agiu — nada de papel ou permissões. Assim o
 * `/auth/registrar`, que é público e ainda não tem sessão, também consegue
 * registrar a criação da fazenda usando a conta que acabou de criar.
 */
export type AutorAtividade = Pick<UsuarioAutenticado, 'id' | 'nome' | 'email'>;

export interface FiltrosAtividade {
  /** Uma entidade, ou várias quando a tela junta módulos (animal + pesagens). */
  entidade?: EntidadeAtividade | EntidadeAtividade[];
  /** Casa tanto o registro afetado quanto o registro dono — ver `contextoId`. */
  registroId?: string;
  acao?: AcaoAtividade;
  autorId?: string;
  /** Datas em YYYY-MM-DD (o dia de `ate` entra inteiro). */
  de?: string;
  ate?: string;
  busca?: string;
  pagina?: number;
  porPagina?: number;
}

interface DadosRegistro {
  registroId?: string | null;
  contextoId?: string | null;
  detalhes?: Record<string, unknown> | null;
}

/**
 * Grava uma linha na trilha de atividades.
 *
 * Duas decisões que valem explicação:
 *
 * 1. Nunca lança. Falhar ao escrever o log não pode desfazer nem bloquear a
 *    ação que o usuário acabou de fazer — o cadastro do lote é o que importa,
 *    a linha do histórico é consequência. O erro vai pro console do servidor.
 * 2. É aguardado, e não disparado em segundo plano. Em serverless (Vercel) a
 *    função pode ser congelada assim que a resposta sai, e um insert pendente
 *    morreria com ela — o log ficaria com buracos silenciosos, que é o pior
 *    defeito possível numa auditoria. É um INSERT só, com índice; o custo é
 *    de poucos milissegundos.
 */
async function registrar(
  empresaId: string | null | undefined,
  autor: AutorAtividade,
  acao: AcaoAtividade,
  entidade: EntidadeAtividade,
  descricao: string,
  dados: DadosRegistro = {},
): Promise<void> {
  // Sem fazenda no contexto não há onde pendurar o registro (acontece com o
  // ADMIN de suporte antes de escolher uma fazenda).
  if (!empresaId) return;

  try {
    await prisma.registroAtividade.create({
      data: {
        empresaId,
        acao,
        entidade,
        registroId: dados.registroId ?? null,
        contextoId: dados.contextoId ?? null,
        descricao,
        detalhes: (dados.detalhes ?? undefined) as Prisma.InputJsonValue | undefined,
        autorId: autor.id,
        autorNome: autor.nome,
        autorEmail: autor.email,
      },
    });
  } catch (e) {
    console.error('Falha ao registrar atividade:', e);
  }
}

/**
 * Fábrica usada pelas rotas: `await auditar(user, empresaId).criacao(...)`.
 *
 * Existe pra que instrumentar uma rota seja uma linha só — quando registrar
 * dá trabalho, o log começa a ser esquecido nas rotas novas, e um histórico
 * com furos é pior que não ter histórico.
 */
export function auditar(autor: AutorAtividade, empresaId: string | null | undefined) {
  const acoes = (contextoId: string | null) => {
    const comAcao =
      (acao: AcaoAtividade) =>
      (entidade: EntidadeAtividade, registroId: string | null, descricao: string, detalhes?: Record<string, unknown>) =>
        registrar(empresaId, autor, acao, entidade, descricao, { registroId, contextoId, detalhes });

    return {
      criacao: comAcao(AcaoAtividade.CRIACAO),
      atualizacao: comAcao(AcaoAtividade.ATUALIZACAO),
      exclusao: comAcao(AcaoAtividade.EXCLUSAO),
      movimentacao: comAcao(AcaoAtividade.MOVIMENTACAO),
    };
  };

  return {
    ...acoes(null),
    /**
     * `auditar(user, empresaId).noContexto(animalId).criacao(...)` — prende o
     * evento ao registro dono, pra ele aparecer no histórico daquela tela de
     * detalhe. Método próprio em vez de um quinto parâmetro solto: `criacao(a,
     * b, c, d, e)` não diria a ninguém o que é o quinto argumento.
     */
    noContexto: (contextoId: string) => acoes(contextoId),
  };
}

/** Formata reais nas descrições do log (gastos, lançamentos). */
export function brl(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function montarWhere(empresaId: string, filtros: FiltrosAtividade): Prisma.RegistroAtividadeWhereInput {
  const where: Prisma.RegistroAtividadeWhereInput = { empresaId };

  if (filtros.entidade) {
    where.entidade = Array.isArray(filtros.entidade) ? { in: filtros.entidade } : filtros.entidade;
  }
  // O histórico de um registro traz o que mexeu nele E o que aconteceu dentro
  // dele: a pesagem do animal tem `registroId` da pesagem e `contextoId` do
  // animal, então filtrar só por `registroId` deixaria a pesagem de fora.
  if (filtros.registroId) {
    where.OR = [{ registroId: filtros.registroId }, { contextoId: filtros.registroId }];
  }
  if (filtros.acao) where.acao = filtros.acao;
  if (filtros.autorId) where.autorId = filtros.autorId;
  // Busca livre na descrição já pronta — é o texto que a pessoa vê na tela.
  if (filtros.busca?.trim()) where.descricao = { contains: filtros.busca.trim(), mode: 'insensitive' };

  if (filtros.de || filtros.ate) {
    where.createdAt = {
      ...(filtros.de ? { gte: new Date(`${filtros.de}T00:00:00`) } : {}),
      // O dia informado em "até" entra inteiro: quem filtra "até hoje" espera
      // ver o que acabou de fazer, não só o que aconteceu à meia-noite.
      ...(filtros.ate ? { lte: new Date(`${filtros.ate}T23:59:59.999`) } : {}),
    };
  }

  return where;
}

export async function listar(empresaId: string, filtros: FiltrosAtividade) {
  const porPagina = Math.min(Math.max(filtros.porPagina ?? POR_PAGINA_PADRAO, 1), POR_PAGINA_MAX);
  const pagina = Math.max(filtros.pagina ?? 1, 1);
  const where = montarWhere(empresaId, filtros);

  const [itens, total] = await Promise.all([
    prisma.registroAtividade.findMany({
      where,
      // Desempate por id: dois registros da mesma transação podem cair no mesmo
      // milissegundo, e sem isso a ordem varia entre páginas — a mesma linha
      // apareceria duas vezes ou desapareceria na paginação.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
    prisma.registroAtividade.count({ where }),
  ]);

  return { itens, total, pagina, porPagina };
}

/** Autores que aparecem no log da fazenda, pro filtro "quem fez" da tela. */
export async function autores(empresaId: string) {
  const registros = await prisma.registroAtividade.groupBy({
    by: ['autorId', 'autorNome'],
    where: { empresaId, autorId: { not: null } },
    orderBy: { autorNome: 'asc' },
  });
  return registros.map((r) => ({ id: r.autorId!, nome: r.autorNome }));
}
