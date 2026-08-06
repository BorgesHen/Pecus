import { NotFoundException } from '@nestjs/common';
import { ModuloSistema, NivelAcesso, StatusAnimal } from '@pecus/shared';
import { rota } from '@/server/rota';
import { autorizar } from '@/server/autorizar';
import { prisma } from '@/server/prisma';
import * as custoAnimalService from '@/server/animais/custo-animal.service';

/**
 * Custo individual dos animais de um lote, do mais caro pro mais barato.
 *
 * É a tela que responde "por que aquele boi custou mais que o vizinho": compra e
 * rateio são iguais pra todos do lote, então a ordenação é, na prática, o
 * ranking do que foi lançado direto em cada bicho (remédio, exame).
 *
 * Permissão de Gastos, e não de Lotes: a resposta é financeira (ver
 * /animais/[id]/custo).
 */
export const GET = rota(async (req, { params }) => {
  const { empresaId } = await autorizar(req, {
    moduloAtivo: ModuloSistema.LOTES,
    permissao: { modulo: ModuloSistema.GASTOS, nivel: NivelAcesso.VER },
  });

  const lote = await prisma.lote.findFirst({
    where: { id: params.id, empresaId },
    select: { id: true, identificacao: true },
  });
  if (!lote) throw new NotFoundException('Lote não encontrado.');

  const animais = await prisma.animal.findMany({
    where: { empresaId, loteId: params.id, status: StatusAnimal.ATIVO },
    select: { id: true, identificador: true, loteId: true, valorRecebido: true },
    orderBy: { identificador: 'asc' },
  });

  const custos = await custoAnimalService.custoDeAnimais(empresaId, animais);

  const linhas = animais
    .map((animal) => {
      const custo = custos.get(animal.id)!;
      return {
        animalId: animal.id,
        identificador: animal.identificador,
        compra: custo.compra,
        rateio: custo.rateio?.porCabeca ?? 0,
        direto: custo.totalDireto,
        total: custo.total,
        receita: custo.receita,
        lucro: custo.lucro,
        lancamentosSemValor: custo.diretosSemValor,
      };
    })
    .sort((a, b) => b.total - a.total);

  const primeiro = custos.get(animais[0]?.id ?? '');

  return {
    lote,
    /** Iguais pra todo o lote — a tela mostra uma vez, em vez de repetir por linha. */
    comum: {
      compraPorCabeca: primeiro?.compra ?? null,
      rateioPorCabeca: primeiro?.rateio?.porCabeca ?? null,
      totalRateavel: primeiro?.rateio?.totalRateavel ?? null,
      totalGastos: primeiro?.rateio?.totalGastos ?? null,
      totalConsumoDeInsumo: primeiro?.rateio?.totalConsumoDeInsumo ?? null,
      comprasDeInsumo: primeiro?.rateio?.totalComprasDeInsumo ?? null,
      cabecas: primeiro?.rateio?.cabecas ?? null,
    },
    ressalvas: primeiro?.ressalvas ?? [],
    // Quatro casas pelo mesmo motivo de custo-animal.ts: somar doses baratas em
    // centavos zera o total.
    totalDiretoDoLote: Math.round(linhas.reduce((soma, l) => soma + l.direto, 0) * 10_000) / 10_000,
    animais: linhas,
  };
});
