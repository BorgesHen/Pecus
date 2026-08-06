import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  EspecieAnimal,
  NaturezaFinanceira,
  StatusAnimal,
  agregarAbateDoLote,
  calcularAbateAnimal,
  rendimentoEstimadoDoLote,
  validarDataAbate,
  type AbateDoLote,
  type ResultadoAbateAnimal,
} from '@pecus/shared';
import { prisma } from '../prisma';
import type { RegistrarAbateDto } from './dto';

/**
 * Abate: o rendimento de carcaça que só existe depois que o animal sai.
 *
 * A saída não encerra o registro do animal — ela abre esta etapa. O frigorífico
 * devolve a nota dias depois, e é o peso de carcaça dela que fecha o rendimento
 * real do animal e, somado, o do lote.
 *
 * A conta em si está em `abate.ts` (shared), pura. Aqui fica o que depende do
 * banco: achar o peso de saída, validar o estado do animal e agregar por lote.
 */

/** Só faz sentido informar carcaça de quem saiu — e quem foi transferido saiu vivo. */
const STATUS_COM_ABATE: StatusAnimal[] = [StatusAnimal.VENDIDO, StatusAnimal.MORTO];

/**
 * Peso de saída = a última pesagem do animal.
 *
 * É a referência de reserva do rendimento, usada quando a nota não traz o peso
 * vivo do frigorífico. Vem de `PesagemAnimal` porque é lá que o peso de saída é
 * gravado (ver `registrarPesoDeSaida`) — não existe coluna separada pra ele.
 */
async function pesoDeSaida(animalId: string): Promise<number | null> {
  const ultima = await prisma.pesagemAnimal.findFirst({
    where: { animalId },
    orderBy: { data: 'desc' },
    select: { peso: true },
  });
  return ultima?.peso ?? null;
}

export interface AbateDoAnimal extends ResultadoAbateAnimal {
  dataAbate: string | null;
  observacaoAbate: string | null;
  /** Valor total recebido pela venda. Nulo = ainda não informado. */
  valorRecebido: number | null;
  /** R$ por arroba implícito (total ÷ arrobas) — derivado, nunca gravado. */
  valorPorArroba: number | null;
  /** Nulo = o animal ainda está no rebanho, então não há abate a informar. */
  podeInformar: boolean;
  /** Saiu do rebanho e ainda não tem carcaça — o trabalho pendente. */
  pendente: boolean;
}

export async function obterAbate(empresaId: string, animalId: string): Promise<AbateDoAnimal> {
  const animal = await prisma.animal.findFirst({
    where: { id: animalId, empresaId },
    select: {
      especie: true,
      status: true,
      pesoCarcaca: true,
      pesoVivoAbate: true,
      dataAbate: true,
      observacaoAbate: true,
      valorRecebido: true,
    },
  });
  if (!animal) throw new NotFoundException('Animal não encontrado.');

  const calculo = calcularAbateAnimal({
    pesoCarcaca: animal.pesoCarcaca,
    pesoVivoAbate: animal.pesoVivoAbate,
    pesoSaida: await pesoDeSaida(animalId),
    especie: animal.especie as EspecieAnimal,
  });

  const podeInformar = STATUS_COM_ABATE.includes(animal.status as StatusAnimal);
  return {
    ...calculo,
    dataAbate: animal.dataAbate ? animal.dataAbate.toISOString().slice(0, 10) : null,
    observacaoAbate: animal.observacaoAbate,
    valorRecebido: animal.valorRecebido == null ? null : Number(animal.valorRecebido),
    /** R$ por arroba implícito — derivado, nunca gravado. */
    valorPorArroba:
      animal.valorRecebido != null && calculo.arrobas
        ? Math.round((Number(animal.valorRecebido) / calculo.arrobas) * 100) / 100
        : null,
    podeInformar,
    pendente: podeInformar && animal.pesoCarcaca == null,
  };
}

/**
 * Grava (ou corrige) os dados de abate.
 *
 * Não bloqueia rendimento fora do usual: devolve o aviso e grava. Um rendimento
 * estranho pode ser erro de digitação, mas também pode ser um animal magro ou um
 * abate de emergência — recusar o registro produziria nota não lançada, que é
 * pior que número esquisito à vista.
 */
export async function registrarAbate(empresaId: string, animalId: string, dto: RegistrarAbateDto) {
  const animal = await prisma.animal.findFirst({
    where: { id: animalId, empresaId },
    select: {
      id: true,
      identificador: true,
      especie: true,
      categoria: true,
      loteId: true,
      status: true,
      dataSaida: true,
    },
  });
  if (!animal) throw new NotFoundException('Animal não encontrado.');

  if (!STATUS_COM_ABATE.includes(animal.status as StatusAnimal)) {
    throw new BadRequestException([
      animal.status === StatusAnimal.ATIVO
        ? 'Este animal ainda está no rebanho. Registre a saída dele antes de informar o abate.'
        : 'Animal transferido saiu vivo para outra fazenda, então não tem carcaça a informar.',
    ]);
  }

  const problemaNaData = validarDataAbate(animal.dataSaida, dto.dataAbate);
  if (problemaNaData) throw new BadRequestException([problemaNaData]);

  // `?? null` nos opcionais, e não `undefined`: o Prisma IGNORA campo undefined,
  // então omitir o peso do frigorífico deixava o valor anterior gravado. Quem
  // corrige a nota e apaga esse campo tem que vê-lo apagado — este endpoint
  // substitui o registro de abate inteiro, não faz remendo em cima do antigo.
  const atualizado = await prisma.$transaction(async (tx) => {
    const animalAtualizado = await tx.animal.update({
      where: { id: animalId },
      data: {
        pesoCarcaca: dto.pesoCarcaca,
        pesoVivoAbate: dto.pesoVivoAbate ?? null,
        dataAbate: new Date(dto.dataAbate),
        observacaoAbate: dto.observacaoAbate ?? null,
        valorRecebido: dto.valorRecebido ?? null,
      },
      select: { pesoCarcaca: true, pesoVivoAbate: true, dataAbate: true, observacaoAbate: true },
    });

    await sincronizarReceitaDaVenda(tx, {
      empresaId,
      animalId,
      identificador: animal.identificador,
      categoria: animal.categoria,
      loteId: animal.loteId,
      valorRecebido: dto.valorRecebido ?? null,
      dataAbate: new Date(dto.dataAbate),
      contatoId: dto.contatoId ?? null,
    });

    return animalAtualizado;
  });

  const calculo = calcularAbateAnimal({
    pesoCarcaca: atualizado.pesoCarcaca,
    pesoVivoAbate: atualizado.pesoVivoAbate,
    pesoSaida: await pesoDeSaida(animalId),
    especie: animal.especie as EspecieAnimal,
  });

  return {
    ...calculo,
    animalIdentificador: animal.identificador,
    dataAbate: dto.dataAbate,
    valorRecebido: dto.valorRecebido ?? null,
  };
}

/**
 * Cria, atualiza ou apaga o lançamento de receita da venda do animal.
 *
 * Nasce **em aberto**, com vencimento na data do abate: o frigorífico paga depois,
 * e marcar como recebido antes de o dinheiro cair mostraria um saldo bancário que
 * não existe. Ele aparece em contas a receber e é liquidado quando pagam.
 *
 * Encontra o lançamento pelo `animalId` em vez de criar outro — sem isso, corrigir
 * o valor da nota duplicaria a receita, que é o erro mais caro possível aqui.
 */
async function sincronizarReceitaDaVenda(
  tx: Prisma.TransactionClient,
  dados: {
    empresaId: string;
    animalId: string;
    identificador: string;
    categoria: string;
    loteId: string | null;
    valorRecebido: number | null;
    dataAbate: Date;
    contatoId: string | null;
  },
) {
  const existente = await tx.lancamento.findFirst({
    where: { empresaId: dados.empresaId, animalId: dados.animalId },
    select: { id: true, dataLiquidacao: true },
  });

  if (dados.valorRecebido == null || dados.valorRecebido <= 0) {
    // Valor apagado: some com o lançamento — mas não se ele já foi recebido, que
    // aí é dinheiro em caixa e apagar falsearia o saldo do banco.
    if (existente && !existente.dataLiquidacao) {
      await tx.lancamento.delete({ where: { id: existente.id } });
    }
    return;
  }

  const contaId = await contaDeVendaDeAnimal(tx, dados.empresaId, dados.categoria);
  const dadosDoLancamento = {
    contaId,
    loteId: dados.loteId,
    contatoId: dados.contatoId,
    descricao: `Venda do animal ${dados.identificador}`,
    valorTotal: dados.valorRecebido,
    valorParcela: dados.valorRecebido,
    totalParcelas: 1,
    numeroParcela: 1,
    dataDocumento: dados.dataAbate,
    dataVencimento: dados.dataAbate,
  };

  if (existente) {
    // Preserva a liquidação: corrigir o valor da nota não desfaz um recebimento.
    await tx.lancamento.update({ where: { id: existente.id }, data: dadosDoLancamento });
    return;
  }
  await tx.lancamento.create({
    data: { empresaId: dados.empresaId, animalId: dados.animalId, ...dadosDoLancamento },
  });
}

/**
 * Conta de receita da venda, pela categoria do animal.
 *
 * O plano padrão tem "Vacas", "Novilhas" e "Bois"; o resto (bezerro, touro, e
 * todas as categorias de ovino) vai para "Outros Animais". Sem essa última, a
 * venda de um cordeiro não teria onde ser classificada.
 */
async function contaDeVendaDeAnimal(
  tx: Prisma.TransactionClient,
  empresaId: string,
  categoria: string,
): Promise<string> {
  const codigo =
    categoria === 'VACA' || categoria === 'MATRIZ'
      ? '1.1.1'
      : categoria === 'NOVILHA'
        ? '1.1.2'
        : categoria === 'BOI' || categoria === 'NOVILHO'
          ? '1.1.3'
          : '1.1.4';

  const conta =
    (await tx.contaFinanceira.findFirst({ where: { codigo, grupo: { empresaId } }, select: { id: true } })) ??
    (await tx.contaFinanceira.findFirst({
      where: { codigo: '1.1.4', grupo: { empresaId } },
      select: { id: true },
    }));
  if (conta) return conta.id;

  // Fazenda sem grupo de receita no plano: cria o mínimo pra não recusar a venda.
  const grupo =
    (await tx.grupoFinanceiro.findFirst({ where: { empresaId, codigo: '1.1' }, select: { id: true } })) ??
    (await tx.grupoFinanceiro.create({
      data: { empresaId, natureza: NaturezaFinanceira.RECEITA, codigo: '1.1', nome: 'Receita com Vendas', ordem: 1 },
      select: { id: true },
    }));
  const nova = await tx.contaFinanceira.create({
    data: { grupoId: grupo.id, codigo: '1.1.4', nome: 'Outros Animais' },
    select: { id: true },
  });
  return nova.id;
}

/** Apaga os dados de abate — para quando a nota veio errada e não há o que corrigir. */
export async function removerAbate(empresaId: string, animalId: string) {
  const animal = await prisma.animal.findFirst({
    where: { id: animalId, empresaId },
    select: { id: true, identificador: true, pesoCarcaca: true },
  });
  if (!animal) throw new NotFoundException('Animal não encontrado.');
  if (animal.pesoCarcaca == null) return { ok: true, tinhaAbate: false, pesoCarcaca: null };

  await prisma.$transaction(async (tx) => {
    await tx.animal.update({
      where: { id: animalId },
      data: {
        pesoCarcaca: null,
        pesoVivoAbate: null,
        dataAbate: null,
        observacaoAbate: null,
        valorRecebido: null,
      },
    });
    // A receita vai junto — mas só se ainda não foi recebida (ver a mesma regra
    // em `sincronizarReceitaDaVenda`).
    const receita = await tx.lancamento.findFirst({
      where: { empresaId, animalId, dataLiquidacao: null },
      select: { id: true },
    });
    if (receita) await tx.lancamento.delete({ where: { id: receita.id } });
  });
  return { ok: true, tinhaAbate: true, pesoCarcaca: animal.pesoCarcaca, identificador: animal.identificador };
}

/**
 * Rendimento realizado do lote — carcaça total ÷ peso vivo total.
 *
 * Duas consultas para o lote inteiro (animais e a última pesagem de cada), não
 * uma por animal: a tela do lote pede isso junto com todo o resto.
 */
export async function abateDoLote(
  empresaId: string,
  loteId: string,
): Promise<AbateDoLote & { especie: EspecieAnimal; rendimentoEstimado: number }> {
  const lote = await prisma.lote.findFirst({
    where: { id: loteId, empresaId },
    select: { id: true, especie: true, rendimentoCarcaca: true },
  });
  if (!lote) throw new NotFoundException('Lote não encontrado.');

  const [animais, empresa] = await Promise.all([
    prisma.animal.findMany({
      where: { empresaId, loteId },
      select: { id: true, identificador: true, status: true, pesoCarcaca: true, pesoVivoAbate: true },
      orderBy: { identificador: 'asc' },
    }),
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { rendimentoCarcacaPadrao: true } }),
  ]);

  const pesosDeSaida = await ultimoPesoDe(animais.map((a) => a.id));

  const especie = lote.especie as EspecieAnimal;
  const agregado = agregarAbateDoLote(
    animais.map((a) => ({ ...a, pesoSaida: pesosDeSaida.get(a.id) ?? null })),
    especie,
  );

  return {
    ...agregado,
    especie,
    // A estimativa fica ao lado do realizado — é a comparação que ensina a
    // estimar melhor no lote seguinte.
    rendimentoEstimado: rendimentoEstimadoDoLote(lote.rendimentoCarcaca, especie, empresa?.rendimentoCarcacaPadrao),
  };
}

/** Última pesagem de vários animais numa consulta só (evita N+1 na tela do lote). */
async function ultimoPesoDe(animalIds: string[]): Promise<Map<string, number>> {
  const pesos = new Map<string, number>();
  if (animalIds.length === 0) return pesos;

  const pesagens = await prisma.pesagemAnimal.findMany({
    where: { animalId: { in: animalIds } },
    select: { animalId: true, peso: true, data: true },
    orderBy: { data: 'desc' },
  });
  // Vem por data desc, então o primeiro de cada animal é o mais recente.
  for (const pesagem of pesagens) {
    if (!pesos.has(pesagem.animalId)) pesos.set(pesagem.animalId, pesagem.peso);
  }
  return pesos;
}
