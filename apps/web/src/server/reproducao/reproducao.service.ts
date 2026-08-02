import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CATEGORIAS_REPRODUTIVAS,
  CATEGORIA_CRIA_POR_ESPECIE,
  EspecieAnimal,
  SexoAnimal,
  StatusAnimal,
  TipoEventoReprodutivo,
} from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import type { CriarEventoReprodutivoDto } from './dto';

async function garantirAnimalDaEmpresa(empresaId: string, animalId: string) {
  const animal = await prisma.animal.findFirst({ where: { id: animalId, empresaId } });
  if (!animal) throw new NotFoundException('Animal não encontrado nesta empresa.');
  return animal;
}

export function listarPorAnimal(empresaId: string, animalId: string) {
  return prisma.eventoReprodutivo.findMany({
    where: { empresaId, animalId },
    include: { cria: true },
    orderBy: { data: 'desc' },
  });
}

export async function criar(empresaId: string, dtoOriginal: CriarEventoReprodutivoDto) {
  const mae = await garantirAnimalDaEmpresa(empresaId, dtoOriginal.animalId);
  if (dtoOriginal.criaId) await garantirAnimalDaEmpresa(empresaId, dtoOriginal.criaId);

  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'reproducao', camposDesativados);

  const ehParto = dto.tipo === TipoEventoReprodutivo.PARTO;
  const criasParaCadastrar = ehParto ? dto.crias ?? [] : [];

  // Parto múltiplo é comum em ovinos: numeroCrias registra quantas nasceram
  // (base da prolificidade) mesmo que o produtor não identifique todas com brinco.
  const numeroCrias = ehParto ? dto.numeroCrias ?? Math.max(criasParaCadastrar.length, 1) : undefined;
  if (numeroCrias !== undefined && numeroCrias < criasParaCadastrar.length) {
    throw new BadRequestException(
      `Você informou ${numeroCrias} cria(s) nascida(s), mas está cadastrando ${criasParaCadastrar.length}.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    // A cria herda espécie e lote da mãe (o lote pode ser sobrescrito no DTO).
    const criasCriadas = [];
    for (const cria of criasParaCadastrar) {
      criasCriadas.push(
        await tx.animal.create({
          data: {
            empresaId,
            loteId: dto.criaLoteId ?? mae.loteId,
            identificador: cria.identificador,
            especie: mae.especie,
            sexo: cria.sexo ?? SexoAnimal.FEMEA,
            categoria: CATEGORIA_CRIA_POR_ESPECIE[mae.especie as EspecieAnimal],
            dataNascimento: new Date(dto.data),
            dataEntrada: new Date(dto.data),
            status: StatusAnimal.ATIVO,
          },
        }),
      );
    }

    return tx.eventoReprodutivo.create({
      data: {
        empresaId,
        animalId: dto.animalId,
        tipo: dto.tipo,
        data: new Date(dto.data),
        resultado: dto.resultado,
        observacao: dto.observacao,
        // criaId aponta pra primeira cria; as demais existem como Animal e
        // entram na contagem por numeroCrias.
        criaId: dto.criaId ?? criasCriadas[0]?.id,
        numeroCrias,
      },
    });
  });
}

/** Matrizes/reprodutores ativos com o status reprodutivo derivado do último diagnóstico de gestação. */
export async function listarMatrizes(empresaId: string, especie?: EspecieAnimal) {
  const animais = await prisma.animal.findMany({
    where: {
      empresaId,
      categoria: { in: CATEGORIAS_REPRODUTIVAS },
      status: StatusAnimal.ATIVO,
      ...(especie ? { especie } : {}),
    },
    include: { lote: true },
    orderBy: { identificador: 'asc' },
  });

  if (animais.length === 0) return [];

  // Uma única consulta pra todos os eventos das matrizes, em vez de duas por
  // matriz. O N+1 anterior disparava 2*N consultas em paralelo e estourava o
  // pool de conexões do banco — o que derrubava não só esta tela, mas todas as
  // outras que precisassem de conexão ao mesmo tempo.
  const eventos = await prisma.eventoReprodutivo.findMany({
    where: { empresaId, animalId: { in: animais.map((a) => a.id) } },
    orderBy: { data: 'desc' },
    select: { animalId: true, tipo: true, data: true, resultado: true },
  });

  // Como já vêm ordenados por data desc, o primeiro de cada animal é o mais recente.
  const ultimoEventoPorAnimal = new Map<string, (typeof eventos)[number]>();
  const ultimoDiagnosticoPorAnimal = new Map<string, (typeof eventos)[number]>();
  for (const evento of eventos) {
    if (!ultimoEventoPorAnimal.has(evento.animalId)) ultimoEventoPorAnimal.set(evento.animalId, evento);
    if (
      evento.tipo === TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO &&
      !ultimoDiagnosticoPorAnimal.has(evento.animalId)
    ) {
      ultimoDiagnosticoPorAnimal.set(evento.animalId, evento);
    }
  }

  return animais.map((animal) => {
    const ultimoEvento = ultimoEventoPorAnimal.get(animal.id);
    return {
      ...animal,
      statusReprodutivo: ultimoDiagnosticoPorAnimal.get(animal.id)?.resultado ?? null,
      ultimoEvento: ultimoEvento ? { tipo: ultimoEvento.tipo, data: ultimoEvento.data } : null,
    };
  });
}

/**
 * Indicadores reprodutivos do rebanho, por espécie.
 *
 * - `prolificidade`: crias nascidas por parto. É o indicador que mais separa
 *   ovino de bovino — ovelha pare gêmeos com frequência, então valores acima
 *   de 1,0 são esperados (1,3-1,8 num rebanho bem manejado).
 * - `taxaDesmame`: crias desmamadas por parto — mede quantas realmente chegaram
 *   ao desmame, capturando a mortalidade de cordeiros, que é o principal ponto
 *   de perda da ovinocultura.
 * - `taxaPrenhez`: diagnósticos com resultado positivo sobre o total de
 *   diagnósticos feitos.
 */
export async function indicadores(empresaId: string, especie: EspecieAnimal) {
  const [partos, desmames, diagnosticos, matrizes] = await Promise.all([
    prisma.eventoReprodutivo.findMany({
      where: { empresaId, tipo: TipoEventoReprodutivo.PARTO, animal: { especie } },
      select: { numeroCrias: true },
    }),
    prisma.eventoReprodutivo.count({
      where: { empresaId, tipo: TipoEventoReprodutivo.DESMAME, animal: { especie } },
    }),
    prisma.eventoReprodutivo.findMany({
      where: { empresaId, tipo: TipoEventoReprodutivo.DIAGNOSTICO_GESTACAO, animal: { especie } },
      select: { resultado: true },
    }),
    prisma.animal.count({
      where: { empresaId, especie, categoria: { in: CATEGORIAS_REPRODUTIVAS }, status: StatusAnimal.ATIVO },
    }),
  ]);

  // Partos antigos (antes do campo existir) não têm numeroCrias — contam como cria única.
  const criasNascidas = partos.reduce((total, parto) => total + (parto.numeroCrias ?? 1), 0);
  const prenhes = diagnosticos.filter((d) => (d.resultado ?? '').trim().toLowerCase().startsWith('prenh')).length;

  const arredondar = (valor: number) => Number(valor.toFixed(2));

  return {
    especie,
    matrizesAtivas: matrizes,
    totalPartos: partos.length,
    criasNascidas,
    prolificidade: partos.length > 0 ? arredondar(criasNascidas / partos.length) : null,
    totalDesmames: desmames,
    taxaDesmame: partos.length > 0 ? arredondar(desmames / partos.length) : null,
    totalDiagnosticos: diagnosticos.length,
    taxaPrenhez: diagnosticos.length > 0 ? arredondar((prenhes / diagnosticos.length) * 100) : null,
  };
}
