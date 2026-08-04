import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  StatusAnimal,
  CATEGORIAS_POR_ESPECIE,
  LABEL_CATEGORIA_ANIMAL,
  LABEL_ESPECIE_ANIMAL,
  dataNascimentoPorIdade,
  validarDataPesagem,
  type CategoriaAnimal,
  type EspecieAnimal,
} from '@pecus/shared';
import { gmdPorAnimal, registrarPesoDeSaida } from './pesagem-animal.service';
import { removerCamposDesativados } from '../campos-desativados.util';
import { obterCamposDesativados } from '../empresas/empresas.service';
import { prisma } from '../prisma';
import type { CriarAnimalDto, AtualizarAnimalDto, DarSaidaAnimalDto } from './dto';

async function garantirLoteDaEmpresa(empresaId: string, loteId: string) {
  const lote = await prisma.lote.findFirst({ where: { id: loteId, empresaId } });
  if (!lote) throw new NotFoundException('Lote não encontrado nesta empresa.');
  return lote;
}

/**
 * A espécie do animal é sempre herdada do lote (nunca vem do cliente), então
 * só resta garantir que a categoria escolhida existe naquela espécie — evita
 * cadastrar um "Bezerro" num lote de ovinos, por exemplo.
 */
function garantirCategoriaDaEspecie(especie: EspecieAnimal, categoria: CategoriaAnimal) {
  if (!CATEGORIAS_POR_ESPECIE[especie].includes(categoria)) {
    throw new BadRequestException(
      `A categoria "${LABEL_CATEGORIA_ANIMAL[categoria]}" não é válida para ${LABEL_ESPECIE_ANIMAL[especie]}.`,
    );
  }
}

async function garantirIdentificadorLivre(empresaId: string, identificador: string, ignorarId?: string) {
  const existente = await prisma.animal.findFirst({
    where: { empresaId, identificador, ...(ignorarId ? { id: { not: ignorarId } } : {}) },
  });
  if (existente) throw new ConflictException(['Já existe um animal com esse identificador nesta fazenda.']);
}

/**
 * `incluirPeso` só é verdadeiro pra quem tem permissão no módulo Pesagens.
 * Peso e GMD são dado daquele módulo: sem essa condição, quem só tem acesso a
 * Animais leria o peso do rebanho pela listagem, enquanto a rota de pesagens
 * do animal lhe responde 403 — a permissão viraria decoração.
 */
export async function listar(
  empresaId: string,
  filtros: { loteId?: string; status?: StatusAnimal },
  incluirPeso = false,
) {
  const animais = await prisma.animal.findMany({
    where: { empresaId, loteId: filtros.loteId, status: filtros.status },
    include: { lote: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!incluirPeso) return animais;

  // O GMD de todos sai de uma consulta só (ver gmdPorAnimal) — calcular animal
  // por animal aqui seria um N+1 numa tela que lista o rebanho inteiro.
  const gmds = await gmdPorAnimal(animais);
  return animais.map((animal) => ({ ...animal, gmd: gmds.get(animal.id) ?? null }));
}

export async function detalhar(empresaId: string, id: string) {
  const animal = await prisma.animal.findFirst({ where: { id, empresaId }, include: { lote: true } });
  if (!animal) throw new NotFoundException('Animal não encontrado.');
  return animal;
}

export async function criar(empresaId: string, dtoOriginal: CriarAnimalDto) {
  const lote = await garantirLoteDaEmpresa(empresaId, dtoOriginal.loteId);
  await garantirIdentificadorLivre(empresaId, dtoOriginal.identificador);
  garantirCategoriaDaEspecie(lote.especie as EspecieAnimal, dtoOriginal.categoria);

  const camposDesativados = await obterCamposDesativados(empresaId);
  const dto = removerCamposDesativados(dtoOriginal, 'animais', camposDesativados);

  return prisma.animal.create({
    data: {
      empresaId,
      loteId: dto.loteId,
      identificador: dto.identificador,
      especie: lote.especie,
      sexo: dto.sexo,
      categoria: dto.categoria,
      dataEntrada: new Date(dto.dataEntrada),
      // A tela manda idade; o banco guarda nascimento (ver idade-animal.ts).
      // A referência é a data de entrada: "tinha 18 meses quando chegou" não
      // muda de significado se o cadastro for feito dias depois.
      dataNascimento:
        dto.idadeMeses != null
          ? new Date(dataNascimentoPorIdade(dto.dataEntrada, dto.idadeMeses))
          : undefined,
      pesoEntrada: dto.pesoEntrada,
      observacao: dto.observacao,
    },
  });
}

export async function atualizar(empresaId: string, id: string, dto: AtualizarAnimalDto) {
  const animal = await detalhar(empresaId, id);
  if (dto.identificador) await garantirIdentificadorLivre(empresaId, dto.identificador, id);

  // Trocar de lote pode trocar a espécie do animal; a categoria tem que ser
  // compatível com a espécie de destino.
  const loteDestino = dto.loteId ? await garantirLoteDaEmpresa(empresaId, dto.loteId) : null;
  const especie = (loteDestino?.especie ?? animal.especie) as EspecieAnimal;
  garantirCategoriaDaEspecie(especie, (dto.categoria ?? animal.categoria) as CategoriaAnimal);

  // `idadeMeses` não é coluna: sai do payload e vira data de nascimento,
  // recalculada contra a data de entrada que o animal já tem.
  const { idadeMeses, ...camposDoBanco } = dto;
  const dataEntradaISO = animal.dataEntrada.toISOString().slice(0, 10);

  const atualizado = await prisma.animal.update({
    where: { id },
    data: {
      ...camposDoBanco,
      especie,
      dataNascimento:
        idadeMeses != null
          ? new Date(dataNascimentoPorIdade(dataEntradaISO, idadeMeses))
          : undefined,
    },
  });

  return {
    ...atualizado,
    // Extra só pra trilha de atividades: trocar o animal de lote é uma
    // movimentação de rebanho, não uma edição qualquer, e os dois nomes já
    // estão em mãos aqui (depois do update o lote antigo se perde).
    movimentacaoDeLote:
      loteDestino && loteDestino.id !== animal.loteId
        ? { de: animal.lote?.identificacao ?? null, para: loteDestino.identificacao }
        : null,
  };
}

export async function darSaida(empresaId: string, id: string, dto: DarSaidaAnimalDto) {
  const animal = await detalhar(empresaId, id);
  const dataSaida = new Date(dto.dataSaida);

  if (dto.pesoSaida != null) {
    // A saída não pode ser antes da entrada, senão o peso de saída entraria
    // como pesagem numa data que o animal ainda não estava na fazenda.
    const problema = validarDataPesagem(animal, dto.dataSaida);
    if (problema) throw new BadRequestException([problema]);
  }

  return prisma.$transaction(async (tx) => {
    const atualizado = await tx.animal.update({
      where: { id },
      data: { status: dto.status, dataSaida, motivoSaida: dto.motivoSaida },
    });

    // O peso de saída é gravado como pesagem comum na data da saída: é o que
    // mantém "último peso = peso de saída" verdadeiro por construção.
    if (dto.pesoSaida != null) {
      await registrarPesoDeSaida(tx, id, dataSaida, dto.pesoSaida);
    }

    return atualizado;
  });
}
