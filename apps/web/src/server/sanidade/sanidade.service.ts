import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  StatusAnimal,
  EspecieAnimal,
  FAMACHA_GRAU_ALERTA,
  ECC_ALERTA,
  GRAUS_FAMACHA,
} from '@pecus/shared';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import {
  baixarEstoque,
  converterParaUnidadeDoInsumo,
  obterInsumoParaConsumo,
} from '../insumos/custo-insumo.service';
import { prisma } from '../prisma';
import { garantirEmpresaAtiva } from '../empresa-ativa';
import type { CriarEventoSanitarioDto, AplicarEmMassaDto } from './dto';

async function garantirAnimalDaEmpresa(empresaId: string, animalId: string) {
  const animal = await prisma.animal.findFirst({ where: { id: animalId, empresaId } });
  if (!animal) throw new NotFoundException('Animal não encontrado nesta empresa.');
  return animal;
}

/**
 * Consome insumo do estoque por conta de um manejo sanitário.
 *
 * É a ponte entre sanidade e estoque: converte a unidade digitada (5 ml de um
 * produto cadastrado em litro), dá baixa e devolve quanto aquilo custou ao
 * custo médio do dia. `vezes` multiplica a quantidade — numa aplicação em massa
 * o produtor informa a dose por animal, e o que sai do estoque é dose × cabeças.
 */
async function consumirInsumo(
  tx: Prisma.TransactionClient,
  empresaId: string,
  dados: {
    insumoId: string;
    quantidade?: number | null;
    unidade?: string | null;
    data: Date;
    descricao: string;
    vezes?: number;
  },
) {
  if (dados.quantidade == null || !(dados.quantidade > 0)) {
    throw new BadRequestException(['Informe a quantidade do insumo aplicado.']);
  }
  const vezes = Math.max(1, Math.trunc(dados.vezes ?? 1));
  const insumo = await obterInsumoParaConsumo(tx, empresaId, dados.insumoId);

  // A dose por animal é convertida antes de multiplicar: converter o total
  // daria o mesmo número, mas é a dose que precisa ficar gravada no evento de
  // cada animal, e ela tem que estar na mesma unidade do saldo.
  const dosePorAnimal = converterParaUnidadeDoInsumo(dados.quantidade, dados.unidade, insumo.unidade);

  const baixa = await baixarEstoque(tx, {
    empresaId,
    insumoId: insumo.id,
    nomeDoInsumo: insumo.nome,
    unidadeDoInsumo: insumo.unidade,
    quantidade: dosePorAnimal * vezes,
    // Já convertida acima — passar a unidade de novo converteria duas vezes.
    unidadeInformada: null,
    data: dados.data,
    observacao: vezes > 1 ? `${dados.descricao} (${vezes} animais)` : dados.descricao,
  });

  return {
    ...baixa,
    insumoId: insumo.id,
    nomeDoInsumo: insumo.nome,
    unidadeDoInsumo: insumo.unidade,
    /** Dose de um animal, na unidade de cadastro do insumo. */
    dosePorAnimal,
    /** Custo de um animal — o total da baixa dividido pelas cabeças, sem re-arredondar a média. */
    custoPorAnimal:
      baixa.custoUnitario == null ? null : Math.round(baixa.custoUnitario * dosePorAnimal * 100) / 100,
  };
}

/**
 * Inclui o insumo porque `quantidadeInsumo` está gravada na unidade de CADASTRO
 * do insumo (0,005 para 5 ml de um produto em litro). Sem essa unidade a tela
 * não tem como converter de volta pra "5 ml" — `unidadeInsumo` diz o que foi
 * digitado, não em que unidade o número está.
 */
export async function listarPorAnimal(empresaId: string, animalId: string) {
  const eventos = await prisma.eventoSanitario.findMany({
    where: { empresaId, animalId },
    include: { insumo: { select: { id: true, nome: true, unidade: true } } },
    orderBy: { data: 'desc' },
  });
  // `custo` é Decimal no Prisma e serializa como STRING no JSON. Sem converter
  // aqui, o tipo do frontend (`number | null`) estaria mentindo e a tela
  // formatava "2" em vez de "R$ 2,00" — String.toLocaleString aceita as opções
  // de moeda e as ignora em silêncio.
  return eventos.map((evento) => ({ ...evento, custo: evento.custo == null ? null : Number(evento.custo) }));
}

export async function criar(empresaId: string, dtoOriginal: CriarEventoSanitarioDto) {
  const animal = await garantirAnimalDaEmpresa(empresaId, dtoOriginal.animalId);
  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'sanidade', camposDesativados);

  // Transação porque a baixa de estoque e o evento têm que existir juntos: uma
  // baixa sem evento tiraria remédio do estoque sem dizer em quem foi aplicado.
  const { evento, baixa } = await prisma.$transaction(async (tx) => {
    const baixa = dto.insumoId
      ? await consumirInsumo(tx, empresaId, {
          insumoId: dto.insumoId,
          quantidade: dto.quantidadeInsumo,
          unidade: dto.unidadeInsumo,
          data: new Date(dto.data),
          descricao: `${dto.nome} — animal ${animal.identificador}`,
        })
      : null;

    const evento = await tx.eventoSanitario.create({
      data: {
        empresaId,
        animalId: dto.animalId,
        tipo: dto.tipo,
        nome: dto.nome,
        data: new Date(dto.data),
        proximaAplicacao: dto.proximaAplicacao ? new Date(dto.proximaAplicacao) : undefined,
        escoreFamacha: dto.escoreFamacha,
        escoreCorporal: dto.escoreCorporal,
        observacao: dto.observacao,
        insumoId: dto.insumoId,
        quantidadeInsumo: baixa?.dosePorAnimal,
        unidadeInsumo: dto.insumoId ? (dto.unidadeInsumo ?? baixa?.unidadeDoInsumo) : undefined,
        custo: baixa?.custoPorAnimal,
        movimentoInsumoId: baixa?.movimentoId,
      },
    });

    return { evento, baixa };
  });

  // O identificador do animal acompanha o evento pra trilha de atividades
  // registrar "Vacina em 123" em vez de um id opaco.
  return {
    ...evento,
    // Mesmo motivo de listarPorAnimal: Decimal serializa como string.
    custo: evento.custo == null ? null : Number(evento.custo),
    animalIdentificador: animal.identificador,
    insumoNome: baixa?.nomeDoInsumo ?? null,
    /** Unidade de cadastro do insumo — a base em que `quantidadeInsumo` está gravada. */
    insumoUnidade: baixa?.unidadeDoInsumo ?? null,
    custoUnitario: baixa?.custoUnitario ?? null,
    saldoDepois: baixa?.saldoDepois ?? null,
    aviso: baixa?.aviso ?? null,
  };
}

/**
 * Aplica o mesmo evento em todos os animais ativos de um lote, ou numa lista
 * explícita de animais.
 *
 * Com insumo, `quantidadeInsumo` é a **dose por animal** — é assim que o manejo
 * funciona ("2 ml por cabeça"), e é o que permite dar ao evento de cada animal
 * o custo dele. Do estoque sai dose × cabeças, numa baixa só: cinquenta linhas
 * no extrato por uma vacinação tornariam o extrato ilegível.
 */
export async function aplicarEmMassa(empresaId: string, dto: AplicarEmMassaDto) {
  let animalIds = dto.animalIds ?? [];

  if (dto.loteId) {
    const animaisDoLote = await prisma.animal.findMany({
      where: { empresaId, loteId: dto.loteId, status: StatusAnimal.ATIVO },
      select: { id: true },
    });
    animalIds = [...new Set([...animalIds, ...animaisDoLote.map((a) => a.id)])];
  }

  if (animalIds.length === 0) throw new BadRequestException('Informe um lote ou ao menos um animal.');

  const animaisValidos = await prisma.animal.count({ where: { empresaId, id: { in: animalIds } } });
  if (animaisValidos !== animalIds.length) throw new NotFoundException('Um ou mais animais não pertencem a esta empresa.');

  const data = new Date(dto.data);
  const proximaAplicacao = dto.proximaAplicacao ? new Date(dto.proximaAplicacao) : undefined;

  const baixa = await prisma.$transaction(async (tx) => {
    const baixa = dto.insumoId
      ? await consumirInsumo(tx, empresaId, {
          insumoId: dto.insumoId,
          quantidade: dto.quantidadeInsumo,
          unidade: dto.unidadeInsumo,
          data,
          descricao: dto.nome,
          vezes: animalIds.length,
        })
      : null;

    await tx.eventoSanitario.createMany({
      data: animalIds.map((animalId) => ({
        empresaId,
        animalId,
        tipo: dto.tipo,
        nome: dto.nome,
        data,
        proximaAplicacao,
        observacao: dto.observacao,
        insumoId: dto.insumoId,
        quantidadeInsumo: baixa?.dosePorAnimal,
        unidadeInsumo: dto.insumoId ? (dto.unidadeInsumo ?? baixa?.unidadeDoInsumo) : undefined,
        // Cada animal carrega o custo da SUA dose, não o total dividido: assim
        // o custo de um animal não muda se outro entrar ou sair da aplicação.
        custo: baixa?.custoPorAnimal,
        movimentoInsumoId: baixa?.movimentoId,
      })),
    });

    return baixa;
  });

  return {
    ok: true,
    animaisAfetados: animalIds.length,
    insumo: baixa
      ? {
          nome: baixa.nomeDoInsumo,
          unidade: baixa.unidadeDoInsumo,
          dosePorAnimal: baixa.dosePorAnimal,
          quantidadeTotal: baixa.quantidade,
          custoUnitario: baixa.custoUnitario,
          custoPorAnimal: baixa.custoPorAnimal,
          custoTotal: baixa.valorTotal,
          saldoDepois: baixa.saldoDepois,
        }
      : null,
    aviso: baixa?.aviso ?? null,
  };
}

/**
 * Eventos vencidos e os que vencem nos próximos `dias`. Sem `dias`, usa o
 * padrão da fazenda — e se a fazenda desligou o aviso de vencimento, devolve
 * vazio (os registros continuam lá, só não geram alerta).
 */
export async function proximosVencimentos(empresaId: string, dias?: number) {
  empresaId = garantirEmpresaAtiva(empresaId);
  if (dias === undefined) {
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { sanidadeDiasAvisoVencimento: true, avisoVencimentoSanitarioAtivo: true },
    });
    if (empresa && !empresa.avisoVencimentoSanitarioAtivo) {
      return { vencidos: [], proximos: [], avisoDesativado: true as const };
    }
    dias = empresa?.sanidadeDiasAvisoVencimento ?? 7;
  }

  const hoje = new Date();
  const limite = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000);

  const eventos = await prisma.eventoSanitario.findMany({
    where: { empresaId, proximaAplicacao: { not: null, lte: limite } },
    include: { animal: true },
    orderBy: { proximaAplicacao: 'asc' },
  });

  return {
    vencidos: eventos.filter((e) => e.proximaAplicacao! < hoje),
    proximos: eventos.filter((e) => e.proximaAplicacao! >= hoje),
    avisoDesativado: false as const,
  };
}

export function historicoRecente(empresaId: string, limite = 20) {
  return prisma.eventoSanitario.findMany({ where: { empresaId }, include: { animal: true }, orderBy: { data: 'desc' }, take: limite });
}

/**
 * Alerta de vermifugação seletiva (manejo ovino, método FAMACHA©).
 *
 * Pega a avaliação mais recente de cada ovino ativo e decide a conduta:
 * grau 4-5 = vermifugar; grau 3 = vermifugar só se o animal estiver magro
 * (ECC abaixo de ECC_ALERTA), que é justamente o critério que permite tratar
 * uma fração do rebanho em vez de todo ele.
 */
export async function alertaFamacha(empresaId: string) {
  empresaId = garantirEmpresaAtiva(empresaId);
  const avaliacoes = await prisma.eventoSanitario.findMany({
    where: {
      empresaId,
      escoreFamacha: { not: null },
      animal: { especie: EspecieAnimal.OVINO, status: StatusAnimal.ATIVO },
    },
    include: { animal: { include: { lote: { select: { id: true, identificacao: true } } } } },
    orderBy: { data: 'desc' },
  });

  // A lista vem ordenada por data desc, então o primeiro de cada animal é o mais recente.
  const ultimaPorAnimal = new Map<string, (typeof avaliacoes)[number]>();
  for (const avaliacao of avaliacoes) {
    if (!ultimaPorAnimal.has(avaliacao.animalId)) ultimaPorAnimal.set(avaliacao.animalId, avaliacao);
  }

  const avaliados = [...ultimaPorAnimal.values()].map((avaliacao) => {
    const grau = avaliacao.escoreFamacha!;
    const ecc = avaliacao.escoreCorporal;
    const magro = ecc != null && ecc < ECC_ALERTA;
    const precisaVermifugar = grau > FAMACHA_GRAU_ALERTA || (grau === FAMACHA_GRAU_ALERTA && magro);

    return {
      animalId: avaliacao.animalId,
      identificador: avaliacao.animal.identificador,
      lote: avaliacao.animal.lote,
      data: avaliacao.data,
      escoreFamacha: grau,
      escoreCorporal: ecc,
      precisaVermifugar,
      conduta:
        GRAUS_FAMACHA.find((g) => g.grau === grau)?.conduta ??
        (precisaVermifugar ? 'Vermifugar.' : 'Não vermifugar.'),
    };
  });

  const paraVermifugar = avaliados.filter((a) => a.precisaVermifugar);

  return {
    // Quantos ovinos ativos ainda não têm nenhuma avaliação registrada.
    semAvaliacao: await prisma.animal.count({
      where: {
        empresaId,
        especie: EspecieAnimal.OVINO,
        status: StatusAnimal.ATIVO,
        eventosSanitarios: { none: { escoreFamacha: { not: null } } },
      },
    }),
    totalAvaliados: avaliados.length,
    paraVermifugar,
    // Ordena do grau mais crítico pro menos, pra a tela mostrar o pior primeiro.
    avaliados: avaliados.sort((a, b) => b.escoreFamacha - a.escoreFamacha),
  };
}
