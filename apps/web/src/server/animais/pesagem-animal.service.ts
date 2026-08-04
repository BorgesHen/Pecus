import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { calcularGmdAnimal, validarDataPesagem, type ResultadoGmdAnimal } from '@pecus/shared';
import { prisma } from '../prisma';
import type { CriarPesagemAnimalDto } from './dto';

/** Animal + pesagens + GMD calculado, como as telas consomem. */
export interface HistoricoPesoAnimal {
  pesagens: { id: string; data: Date; peso: number; observacao: string | null }[];
  gmd: ResultadoGmdAnimal;
}

async function garantirAnimal(empresaId: string, animalId: string) {
  const animal = await prisma.animal.findFirst({
    where: { id: animalId, empresaId },
    select: { id: true, identificador: true, especie: true, dataEntrada: true, pesoEntrada: true, dataSaida: true },
  });
  if (!animal) throw new NotFoundException('Animal não encontrado.');
  return animal;
}

export async function listar(empresaId: string, animalId: string): Promise<HistoricoPesoAnimal> {
  const animal = await garantirAnimal(empresaId, animalId);
  const pesagens = await prisma.pesagemAnimal.findMany({
    where: { animalId },
    orderBy: { data: 'asc' },
    select: { id: true, data: true, peso: true, observacao: true },
  });
  return { pesagens, gmd: calcularGmdAnimal(animal, pesagens) };
}

/** Início e fim do dia, pra procurar pesagem existente naquela data. */
function faixaDoDia(data: string) {
  const dia = data.slice(0, 10);
  return { gte: new Date(`${dia}T00:00:00.000Z`), lte: new Date(`${dia}T23:59:59.999Z`) };
}

export async function criar(empresaId: string, animalId: string, dto: CriarPesagemAnimalDto) {
  const animal = await garantirAnimal(empresaId, animalId);

  // Data fora da vida do animal é erro de digitação, não registro — e uma data
  // errada desloca o GMD sem deixar pista de que está errado.
  const problema = validarDataPesagem(animal, dto.data);
  if (problema) throw new BadRequestException([problema]);

  // Um peso por animal por dia. Duplicata na mesma data é quase sempre duplo
  // clique ou lançamento repetido: ela não muda o GMD geral (o primeiro e o
  // último ponto mandam), mas deixa no histórico uma linha de "0 kg em 0 dias"
  // que ninguém consegue explicar.
  const existente = await prisma.pesagemAnimal.findFirst({
    where: { animalId, data: faixaDoDia(dto.data) },
  });
  if (existente) {
    throw new ConflictException([
      `Este animal já tem uma pesagem de ${existente.peso} kg nesta data. Exclua a anterior se quiser corrigir o valor.`,
    ]);
  }

  const pesagem = await prisma.pesagemAnimal.create({
    data: { animalId, data: new Date(dto.data), peso: dto.peso, observacao: dto.observacao },
  });

  return { ...pesagem, animalIdentificador: animal.identificador };
}

/**
 * Grava o peso de saída como pesagem na data da saída. Se já houver pesagem
 * naquele dia, substitui o valor em vez de criar uma segunda: o peso da saída é
 * o que vale (é o que fecha o GMD), e duas linhas no mesmo dia é justamente o
 * que a regra de uma-por-dia evita.
 *
 * Recebe o `tx` porque roda dentro da transação que dá saída no animal.
 */
export async function registrarPesoDeSaida(
  tx: Prisma.TransactionClient,
  animalId: string,
  dataSaida: Date,
  peso: number,
) {
  const existente = await tx.pesagemAnimal.findFirst({
    where: { animalId, data: faixaDoDia(dataSaida.toISOString()) },
  });

  if (existente) {
    return tx.pesagemAnimal.update({
      where: { id: existente.id },
      data: { peso, observacao: 'Peso de saída' },
    });
  }
  return tx.pesagemAnimal.create({
    data: { animalId, data: dataSaida, peso, observacao: 'Peso de saída' },
  });
}

export async function remover(empresaId: string, animalId: string, pesagemId: string) {
  await garantirAnimal(empresaId, animalId);
  // O animalId entra no where junto com o id: sem ele, o id de uma pesagem de
  // outro animal (ou de outra fazenda) passaria.
  const pesagem = await prisma.pesagemAnimal.findFirst({ where: { id: pesagemId, animalId } });
  if (!pesagem) throw new NotFoundException('Pesagem não encontrada neste animal.');

  await prisma.pesagemAnimal.delete({ where: { id: pesagemId } });
  return { ok: true, peso: pesagem.peso, data: pesagem.data };
}

/**
 * GMD de vários animais de uma vez, pra listagem.
 *
 * Uma consulta só pra todas as pesagens, agrupadas em memória. Calcular animal
 * por animal seria um N+1 — foi o que derrubou as telas de reprodução e estoque
 * antes, porque cada consulta ocupa uma conexão do pool.
 */
export async function gmdPorAnimal(
  animais: { id: string; dataEntrada: Date; pesoEntrada: number | null; dataSaida: Date | null }[],
): Promise<Map<string, ResultadoGmdAnimal>> {
  const resultado = new Map<string, ResultadoGmdAnimal>();
  if (animais.length === 0) return resultado;

  const pesagens = await prisma.pesagemAnimal.findMany({
    where: { animalId: { in: animais.map((a) => a.id) } },
    orderBy: { data: 'asc' },
    select: { id: true, animalId: true, data: true, peso: true },
  });

  const porAnimal = new Map<string, { id: string; data: Date; peso: number }[]>();
  for (const pesagem of pesagens) {
    const lista = porAnimal.get(pesagem.animalId);
    if (lista) lista.push(pesagem);
    else porAnimal.set(pesagem.animalId, [pesagem]);
  }

  for (const animal of animais) {
    resultado.set(animal.id, calcularGmdAnimal(animal, porAnimal.get(animal.id) ?? []));
  }
  return resultado;
}
