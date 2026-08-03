import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EspecieAnimal, RECURSO_OVINOS } from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import { garantirRecurso } from '../recursos';
import type { CriarLoteDto, AtualizarLoteDto, TrocarMetodoLoteDto } from './dto';

async function garantirAreaDaEmpresa(empresaId: string, areaId: string) {
  const area = await prisma.area.findFirst({ where: { id: areaId, empresaId } });
  if (!area) throw new NotFoundException('Área não encontrada nesta empresa.');
}

/** Espécies fora de BOVINO dependem de recurso liberado pra fazenda. */
async function garantirEspecieLiberada(empresaId: string, especie?: EspecieAnimal) {
  if (especie === EspecieAnimal.OVINO) {
    await garantirRecurso(
      empresaId,
      RECURSO_OVINOS,
      'O recurso de ovinos não está liberado para esta fazenda.',
    );
  }
}

/**
 * Peso e valor do kg andam juntos: sem os dois não existe custo por cabeça, e
 * guardar só um deixaria o lote com uma compra pela metade que nenhum cálculo
 * consegue usar. Frete e comissão são opcionais (podem ser zero) mas só fazem
 * sentido acompanhados da base.
 */
function garantirCompraCoerente(dto: { pesoMedioCompra?: number; valorKgCompra?: number; fretePorCabeca?: number; comissaoPorCabeca?: number }) {
  const temBase = dto.pesoMedioCompra != null && dto.valorKgCompra != null;
  const informouAlgo =
    dto.pesoMedioCompra != null ||
    dto.valorKgCompra != null ||
    dto.fretePorCabeca != null ||
    dto.comissaoPorCabeca != null;

  if (!informouAlgo || temBase) return;

  throw new BadRequestException(
    'Para registrar a compra do lote informe o peso médio e o valor do kg juntos.',
  );
}

export function listar(empresaId: string) {
  return prisma.lote.findMany({
    where: { empresaId },
    include: { metodoManejo: true, _count: { select: { pesagens: true, gastos: true } } },
    orderBy: { dataAquisicao: 'desc' },
  });
}

export async function detalhar(empresaId: string, id: string) {
  const lote = await prisma.lote.findFirst({
    where: { id, empresaId },
    include: {
      metodoManejo: true,
      area: true,
      pesagens: { orderBy: { data: 'asc' } },
      gastos: { orderBy: { data: 'desc' } },
      metodoHistorico: { include: { metodoManejo: true }, orderBy: { dataInicio: 'desc' } },
    },
  });
  if (!lote) throw new NotFoundException('Lote não encontrado.');
  return lote;
}

export async function criar(empresaId: string, dtoOriginal: CriarLoteDto) {
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'lotes', camposDesativados);
  if (dto.areaId) await garantirAreaDaEmpresa(empresaId, dto.areaId);
  await garantirEspecieLiberada(empresaId, dto.especie);
  garantirCompraCoerente(dto);
  const dataAquisicao = new Date(dto.dataAquisicao);
  return prisma.$transaction(async (tx) => {
    const lote = await tx.lote.create({
      data: {
        empresaId,
        identificacao: dto.identificacao,
        especie: dto.especie ?? EspecieAnimal.BOVINO,
        dataAquisicao,
        quantidadeAnimais: dto.quantidadeAnimais,
        pesoMedioEntrada: dto.pesoMedioEntrada,
        metodoManejoId: dto.metodoManejoId,
        areaId: dto.areaId,
        rendimentoCarcaca: dto.rendimentoCarcaca,
        gmdEsperado: dto.gmdEsperado,
        pesoMedioCompra: dto.pesoMedioCompra,
        valorKgCompra: dto.valorKgCompra,
        fretePorCabeca: dto.fretePorCabeca,
        comissaoPorCabeca: dto.comissaoPorCabeca,
      },
    });

    if (dto.metodoManejoId) {
      await tx.loteMetodoHistorico.create({
        data: { loteId: lote.id, metodoManejoId: dto.metodoManejoId, dataInicio: dataAquisicao },
      });
    }

    return lote;
  });
}

export async function atualizar(empresaId: string, id: string, dtoOriginal: AtualizarLoteDto) {
  const lote = await detalhar(empresaId, id);
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'lotes', camposDesativados);
  if (dto.areaId) await garantirAreaDaEmpresa(empresaId, dto.areaId);
  garantirCompraCoerente(dto);

  // Trocar a espécie depois de cadastrar animais deixaria as categorias deles
  // inválidas (ex: "Bezerro" num lote que virou ovino), então só permite
  // corrigir enquanto o lote está vazio.
  if (dto.especie && dto.especie !== lote.especie) {
    await garantirEspecieLiberada(empresaId, dto.especie);
    const animais = await prisma.animal.count({ where: { loteId: id } });
    if (animais > 0) {
      throw new BadRequestException(
        'Não é possível trocar a espécie de um lote que já tem animais cadastrados. Remova os animais primeiro ou crie outro lote.',
      );
    }
  }

  return prisma.lote.update({
    where: { id },
    data: { ...dto, dataAquisicao: dto.dataAquisicao ? new Date(dto.dataAquisicao) : undefined },
  });
}

/** Troca o método de manejo do lote, fechando a fase atual e abrindo uma nova no histórico. */
export async function trocarMetodo(empresaId: string, id: string, dto: TrocarMetodoLoteDto) {
  const lote = await detalhar(empresaId, id);
  const dataTroca = new Date(dto.dataTroca);

  const faseAberta = lote.metodoHistorico.find((h) => h.dataFim === null);
  if (faseAberta && dataTroca < faseAberta.dataInicio) {
    throw new BadRequestException('A data da troca não pode ser anterior ao início da fase atual.');
  }

  return prisma.$transaction(async (tx) => {
    if (faseAberta) {
      await tx.loteMetodoHistorico.update({ where: { id: faseAberta.id }, data: { dataFim: dataTroca } });
    }
    await tx.loteMetodoHistorico.create({
      data: { loteId: id, metodoManejoId: dto.metodoManejoId, dataInicio: dataTroca },
    });
    return tx.lote.update({ where: { id }, data: { metodoManejoId: dto.metodoManejoId } });
  });
}

export async function remover(empresaId: string, id: string) {
  await detalhar(empresaId, id);
  await prisma.lote.delete({ where: { id } });
  return { ok: true };
}
