import { BadRequestException, ConflictException } from '@nestjs/common';
import { prisma } from '../prisma';
import type { CriarMetodoManejoDto } from './dto';

/** Retorna os métodos globais (seed) + os customizados da empresa. */
export function listar(empresaId: string) {
  return prisma.metodoManejo.findMany({
    where: { OR: [{ empresaId: null }, { empresaId }] },
    orderBy: { nome: 'asc' },
  });
}

/**
 * Impede método com nome repetido. A checagem inclui os métodos **globais**
 * de propósito: a listagem mostra os globais e os da fazenda na mesma tabela,
 * então criar um "Confinamento" próprio ao lado do padrão do sistema resultava
 * em duas linhas de mesmo nome — uma "Padrão do sistema", outra "Customizado" —
 * e nenhuma forma de saber qual escolher no cadastro do lote.
 *
 * Compara sem diferenciar maiúsculas: "confinamento" e "Confinamento" são o
 * mesmo método pra quem usa.
 */
async function garantirNomeLivre(empresaId: string, nome: string) {
  const existente = await prisma.metodoManejo.findFirst({
    where: {
      nome: { equals: nome, mode: 'insensitive' },
      OR: [{ empresaId: null }, { empresaId }],
    },
  });
  if (!existente) return;

  throw new ConflictException([
    existente.empresaId === null
      ? `"${existente.nome}" já é um método padrão do sistema — use esse em vez de criar outro.`
      : `Já existe um método chamado "${existente.nome}" nesta fazenda.`,
  ]);
}

export async function criar(empresaId: string, dto: CriarMetodoManejoDto) {
  const nome = dto.nome.trim();
  // Validado aqui, e não só no DTO, porque é o nome já sem espaços das pontas
  // que vai pro banco — "  " passava pelo @IsString() e criava método sem nome.
  if (nome.length < 2) {
    throw new BadRequestException(['Informe um nome com pelo menos 2 letras.']);
  }

  await garantirNomeLivre(empresaId, nome);

  return prisma.metodoManejo.create({ data: { nome, empresaId, tipo: dto.tipo } });
}

/** Só remove métodos customizados da própria empresa (nunca os globais). */
export async function remover(empresaId: string, id: string) {
  const emUsoNoHistorico = await prisma.loteMetodoHistorico.findFirst({ where: { metodoManejoId: id } });
  if (emUsoNoHistorico) {
    throw new ConflictException(['Este método já foi usado por algum lote (aparece no histórico) e não pode ser excluído.']);
  }
  // Lido antes do delete só pra trilha de atividades ter o nome do método.
  const metodo = await prisma.metodoManejo.findFirst({ where: { id, empresaId } });
  await prisma.metodoManejo.deleteMany({ where: { id, empresaId } });
  return { ok: true, nome: metodo?.nome ?? null };
}
