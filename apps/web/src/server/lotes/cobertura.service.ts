import { NotFoundException } from '@nestjs/common';
import { StatusAnimal } from '@pecus/shared';
import { prisma } from '../prisma';

/**
 * Acompanhamento do lote: o que liga o lote aos animais que estão dentro dele.
 *
 * A pergunta que isto responde é a do brete: "o lote tem 50 cabeças, já passei
 * quantas na balança hoje? quem falta?". Antes o lote só sabia a média
 * (`Pesagem`) e o animal só sabia de si (`PesagemAnimal`); ninguém cruzava os
 * dois, então não havia como saber quem faltava.
 *
 * A referência da rodada é a **última pesagem do lote**: lançar uma pesagem de
 * lote abre uma rodada nova e o contador de pendentes reinicia. Sem nenhuma
 * pesagem de lote, a referência é a data de aquisição — ou seja, "quem nunca foi
 * pesado desde que o lote entrou".
 */

/** Teto das listas de pendentes: a tela mostra os primeiros e informa o total. */
const LIMITE_LISTA = 50;
/** Quantos manejos sanitários recentes viram linha de cobertura. */
const MANEJOS_RECENTES = 5;

interface AnimalPendente {
  id: string;
  identificador: string;
}

function recortar<T>(lista: T[]) {
  return { total: lista.length, itens: lista.slice(0, LIMITE_LISTA) };
}

function diaISO(data: Date) {
  return data.toISOString().slice(0, 10);
}

export async function cobertura(empresaId: string, loteId: string) {
  const lote = await prisma.lote.findFirst({
    where: { id: loteId, empresaId },
    select: { id: true, identificacao: true, quantidadeAnimais: true, dataAquisicao: true, especie: true },
  });
  if (!lote) throw new NotFoundException('Lote não encontrado.');

  const animais = await prisma.animal.findMany({
    where: { empresaId, loteId },
    select: { id: true, identificador: true, status: true, dataSaida: true, motivoSaida: true },
    orderBy: { identificador: 'asc' },
  });

  const ativos = animais.filter((a) => a.status === StatusAnimal.ATIVO);
  const ativosIds = ativos.map((a) => a.id);
  const baixas = animais.filter((a) => a.status !== StatusAnimal.ATIVO);

  const ultimaPesagemDoLote = await prisma.pesagem.findFirst({
    where: { loteId },
    orderBy: { data: 'desc' },
    select: { data: true, pesoMedio: true },
  });
  const referencia = ultimaPesagemDoLote?.data ?? lote.dataAquisicao;

  // Duas consultas pro lote inteiro (não por animal): pesagens individuais na
  // rodada e todos os eventos sanitários dos ativos.
  const [pesagensNaRodada, eventos] = await Promise.all([
    ativosIds.length
      ? prisma.pesagemAnimal.findMany({
          where: { animalId: { in: ativosIds }, data: { gte: referencia } },
          select: { animalId: true, data: true, peso: true },
          orderBy: { data: 'desc' },
        })
      : [],
    ativosIds.length
      ? prisma.eventoSanitario.findMany({
          where: { empresaId, animalId: { in: ativosIds } },
          select: { animalId: true, nome: true, data: true, proximaAplicacao: true, custo: true },
          orderBy: { data: 'desc' },
        })
      : [],
  ]);

  // ---------- Pesagem ----------
  const pesadosNaRodada = new Map<string, { data: Date; peso: number }>();
  for (const pesagem of pesagensNaRodada) {
    // A lista vem por data desc, então o primeiro de cada animal é o mais recente.
    if (!pesadosNaRodada.has(pesagem.animalId)) {
      pesadosNaRodada.set(pesagem.animalId, { data: pesagem.data, peso: pesagem.peso });
    }
  }
  const pesagemPendentes: AnimalPendente[] = ativos
    .filter((a) => !pesadosNaRodada.has(a.id))
    .map((a) => ({ id: a.id, identificador: a.identificador }));

  // ---------- Sanidade ----------
  const eventosPorAnimal = new Map<string, typeof eventos>();
  for (const evento of eventos) {
    const lista = eventosPorAnimal.get(evento.animalId) ?? [];
    lista.push(evento);
    eventosPorAnimal.set(evento.animalId, lista);
  }

  // Um "manejo" é a dupla nome + dia: é assim que a aplicação em massa grava
  // (mesmo nome e mesma data pra todo o lote), e é assim que o produtor pensa
  // ("a vacina de aftosa do dia 15").
  const manejosMapa = new Map<string, { nome: string; data: Date; animais: Set<string> }>();
  for (const evento of eventos) {
    const chave = `${evento.nome}|${diaISO(evento.data)}`;
    const manejo = manejosMapa.get(chave) ?? { nome: evento.nome, data: evento.data, animais: new Set<string>() };
    manejo.animais.add(evento.animalId);
    manejosMapa.set(chave, manejo);
  }

  const manejos = [...manejosMapa.values()]
    .sort((a, b) => b.data.getTime() - a.data.getTime())
    .slice(0, MANEJOS_RECENTES)
    .map((manejo) => {
      // Pendente = animal ativo sem nenhum evento com ESTE nome nesta data ou
      // depois. "Ou depois" importa: quem recebeu a mesma vacina numa data
      // posterior está coberto, não pendente.
      const pendentes: AnimalPendente[] = ativos
        .filter((animal) => {
          const dele = eventosPorAnimal.get(animal.id) ?? [];
          return !dele.some((e) => e.nome === manejo.nome && e.data >= manejo.data);
        })
        .map((a) => ({ id: a.id, identificador: a.identificador }));

      return {
        nome: manejo.nome,
        data: diaISO(manejo.data),
        aplicados: manejo.animais.size,
        pendentes: recortar(pendentes),
      };
    });

  const semRegistroSanitario: AnimalPendente[] = ativos
    .filter((a) => !eventosPorAnimal.has(a.id))
    .map((a) => ({ id: a.id, identificador: a.identificador }));

  // Reaplicação vencida: a data marcada passou e não houve evento do mesmo nome
  // de lá pra cá. Sem a segunda condição, quem já foi revacinado continuaria
  // aparecendo como vencido pra sempre.
  const hoje = new Date();
  const identificadorPorId = new Map(animais.map((a) => [a.id, a.identificador]));
  const reaplicacoesVencidas = eventos
    .filter((evento) => {
      if (!evento.proximaAplicacao || evento.proximaAplicacao >= hoje) return false;
      const dele = eventosPorAnimal.get(evento.animalId) ?? [];
      return !dele.some((outro) => outro.nome === evento.nome && outro.data >= evento.proximaAplicacao!);
    })
    .map((evento) => ({
      animalId: evento.animalId,
      identificador: identificadorPorId.get(evento.animalId) ?? '',
      nome: evento.nome,
      proximaAplicacao: diaISO(evento.proximaAplicacao!),
    }));

  const custoSanitarioDoLote = eventos.reduce((soma, e) => soma + Number(e.custo ?? 0), 0);

  return {
    lote: {
      id: lote.id,
      identificacao: lote.identificacao,
      especie: lote.especie,
      quantidadeDeclarada: lote.quantidadeAnimais,
      dataAquisicao: diaISO(lote.dataAquisicao),
    },
    rebanho: {
      declarado: lote.quantidadeAnimais,
      cadastrados: animais.length,
      ativos: ativos.length,
      // Positivo = há cabeças declaradas que ninguém cadastrou individualmente;
      // negativo = há mais animais cadastrados do que o lote declara.
      divergencia: lote.quantidadeAnimais - ativos.length,
      baixas: {
        total: baixas.length,
        porStatus: Object.values(StatusAnimal)
          .filter((status) => status !== StatusAnimal.ATIVO)
          .map((status) => ({ status, quantidade: baixas.filter((a) => a.status === status).length }))
          .filter((linha) => linha.quantidade > 0),
        ultimas: baixas
          .filter((a) => a.dataSaida)
          .sort((a, b) => b.dataSaida!.getTime() - a.dataSaida!.getTime())
          .slice(0, 10)
          .map((a) => ({
            id: a.id,
            identificador: a.identificador,
            status: a.status,
            dataSaida: diaISO(a.dataSaida!),
            motivoSaida: a.motivoSaida,
          })),
      },
    },
    pesagem: {
      referencia: diaISO(referencia),
      origemReferencia: ultimaPesagemDoLote ? ('pesagem-do-lote' as const) : ('aquisicao' as const),
      pesoMedioNaReferencia: ultimaPesagemDoLote?.pesoMedio ?? null,
      pesados: pesadosNaRodada.size,
      pendentes: recortar(pesagemPendentes),
    },
    sanidade: {
      manejos,
      semRegistro: recortar(semRegistroSanitario),
      reaplicacoesVencidas: recortar(reaplicacoesVencidas),
      /** Soma dos custos de insumo lançados nos animais ativos deste lote. */
      // Quatro casas: a soma de doses baratas pode ficar abaixo de um centavo, e
    // em centavos ela viraria zero (ver custo-animal.ts).
    custoInsumosAplicados: Math.round(custoSanitarioDoLote * 10_000) / 10_000,
    },
  };
}
