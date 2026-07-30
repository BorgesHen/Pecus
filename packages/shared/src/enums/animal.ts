export enum SexoAnimal {
  MACHO = 'MACHO',
  FEMEA = 'FEMEA',
}

export const LABEL_SEXO_ANIMAL: Record<SexoAnimal, string> = {
  [SexoAnimal.MACHO]: 'Macho',
  [SexoAnimal.FEMEA]: 'Fêmea',
};

/**
 * Espécie criada no lote/animal. BOVINO é o padrão histórico (todo o sistema
 * nasceu só pra gado de corte), OVINO é liberado por fazenda via recurso
 * personalizado. A espécie muda categorias, cálculos de carcaça e o manejo
 * sanitário/reprodutivo — ver ESPECIE_CONFIG abaixo.
 */
export enum EspecieAnimal {
  BOVINO = 'BOVINO',
  OVINO = 'OVINO',
}

export const LABEL_ESPECIE_ANIMAL: Record<EspecieAnimal, string> = {
  [EspecieAnimal.BOVINO]: 'Bovino (gado)',
  [EspecieAnimal.OVINO]: 'Ovino (ovelhas)',
};

export enum CategoriaAnimal {
  // Bovinos
  BEZERRO = 'BEZERRO',
  NOVILHA = 'NOVILHA',
  NOVILHO = 'NOVILHO',
  VACA = 'VACA',
  MATRIZ = 'MATRIZ',
  TOURO = 'TOURO',
  BOI = 'BOI',
  // Ovinos
  CORDEIRO = 'CORDEIRO',
  BORREGO = 'BORREGO',
  MARRA = 'MARRA',
  OVELHA = 'OVELHA',
  CARNEIRO = 'CARNEIRO',
  CAPAO = 'CAPAO',
  // Comum
  OUTRO = 'OUTRO',
}

export const LABEL_CATEGORIA_ANIMAL: Record<CategoriaAnimal, string> = {
  [CategoriaAnimal.BEZERRO]: 'Bezerro(a)',
  [CategoriaAnimal.NOVILHA]: 'Novilha',
  [CategoriaAnimal.NOVILHO]: 'Novilho',
  [CategoriaAnimal.VACA]: 'Vaca',
  [CategoriaAnimal.MATRIZ]: 'Matriz',
  [CategoriaAnimal.TOURO]: 'Touro',
  [CategoriaAnimal.BOI]: 'Boi',
  [CategoriaAnimal.CORDEIRO]: 'Cordeiro(a) — até 6 meses',
  [CategoriaAnimal.BORREGO]: 'Borrego(a) — 6 a 12 meses',
  [CategoriaAnimal.MARRA]: 'Marrã — fêmea antes do 1º parto',
  [CategoriaAnimal.OVELHA]: 'Ovelha — matriz',
  [CategoriaAnimal.CARNEIRO]: 'Carneiro — reprodutor',
  [CategoriaAnimal.CAPAO]: 'Capão — macho castrado',
  [CategoriaAnimal.OUTRO]: 'Outro',
};

/** Categorias válidas por espécie — usado pra filtrar o select de categoria no cadastro. */
export const CATEGORIAS_POR_ESPECIE: Record<EspecieAnimal, CategoriaAnimal[]> = {
  [EspecieAnimal.BOVINO]: [
    CategoriaAnimal.BEZERRO,
    CategoriaAnimal.NOVILHA,
    CategoriaAnimal.NOVILHO,
    CategoriaAnimal.VACA,
    CategoriaAnimal.MATRIZ,
    CategoriaAnimal.TOURO,
    CategoriaAnimal.BOI,
    CategoriaAnimal.OUTRO,
  ],
  [EspecieAnimal.OVINO]: [
    CategoriaAnimal.CORDEIRO,
    CategoriaAnimal.BORREGO,
    CategoriaAnimal.MARRA,
    CategoriaAnimal.OVELHA,
    CategoriaAnimal.CARNEIRO,
    CategoriaAnimal.CAPAO,
    CategoriaAnimal.OUTRO,
  ],
};

/** Categorias que aparecem na tela de Reprodução (matrizes + reprodutores), por espécie. */
export const CATEGORIAS_REPRODUTIVAS_POR_ESPECIE: Record<EspecieAnimal, CategoriaAnimal[]> = {
  [EspecieAnimal.BOVINO]: [CategoriaAnimal.MATRIZ, CategoriaAnimal.VACA, CategoriaAnimal.TOURO],
  [EspecieAnimal.OVINO]: [CategoriaAnimal.OVELHA, CategoriaAnimal.MARRA, CategoriaAnimal.CARNEIRO],
};

/**
 * Todas as categorias reprodutivas, de qualquer espécie. A tela de Reprodução
 * lista as matrizes das duas espécies juntas (a fazenda mista vê tudo num só
 * lugar); pra filtrar por espécie use CATEGORIAS_REPRODUTIVAS_POR_ESPECIE.
 */
export const CATEGORIAS_REPRODUTIVAS: CategoriaAnimal[] = [
  ...CATEGORIAS_REPRODUTIVAS_POR_ESPECIE[EspecieAnimal.BOVINO],
  ...CATEGORIAS_REPRODUTIVAS_POR_ESPECIE[EspecieAnimal.OVINO],
];

/** Categoria da cria criada automaticamente num evento de PARTO, por espécie. */
export const CATEGORIA_CRIA_POR_ESPECIE: Record<EspecieAnimal, CategoriaAnimal> = {
  [EspecieAnimal.BOVINO]: CategoriaAnimal.BEZERRO,
  [EspecieAnimal.OVINO]: CategoriaAnimal.CORDEIRO,
};

/**
 * Parâmetros que mudam de acordo com a espécie.
 *
 * - `vendePorArroba`: bovino se comercializa em arroba (@ = 15 kg de carcaça);
 *   ovino é vendido por kg de carcaça, então não faz sentido calcular arroba.
 * - `rendimentoCarcacaPadrao`: ovino rende menos que bovino (43-50% típico,
 *   contra ~52% do bovino); usado quando o lote não tem valor próprio.
 * - `gmdEmGramas`: cordeiro ganha peso na casa das centenas de gramas por dia,
 *   então kg/dia fica ilegível — na exibição usamos g/dia.
 * - `kgPorUnidadeAnimal`: 1 UA = 450 kg de bovino. Pra ovino se usa a UA ovina
 *   (~45 kg), pra taxa de lotação do pasto não ficar distorcida.
 */
export interface ConfigEspecie {
  vendePorArroba: boolean;
  rendimentoCarcacaPadrao: number;
  gmdEmGramas: boolean;
  kgPorUnidadeAnimal: number;
  /** Dias de gestação — referência exibida na tela de Reprodução. */
  diasGestacao: number;
}

export const ESPECIE_CONFIG: Record<EspecieAnimal, ConfigEspecie> = {
  [EspecieAnimal.BOVINO]: {
    vendePorArroba: true,
    rendimentoCarcacaPadrao: 52,
    gmdEmGramas: false,
    kgPorUnidadeAnimal: 450,
    diasGestacao: 283,
  },
  [EspecieAnimal.OVINO]: {
    vendePorArroba: false,
    rendimentoCarcacaPadrao: 45,
    gmdEmGramas: true,
    kgPorUnidadeAnimal: 45,
    diasGestacao: 147,
  },
};

export enum StatusAnimal {
  ATIVO = 'ATIVO',
  VENDIDO = 'VENDIDO',
  MORTO = 'MORTO',
  TRANSFERIDO = 'TRANSFERIDO',
}

export const LABEL_STATUS_ANIMAL: Record<StatusAnimal, string> = {
  [StatusAnimal.ATIVO]: 'Ativo',
  [StatusAnimal.VENDIDO]: 'Vendido',
  [StatusAnimal.MORTO]: 'Morto',
  [StatusAnimal.TRANSFERIDO]: 'Transferido',
};
