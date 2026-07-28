export enum SexoAnimal {
  MACHO = 'MACHO',
  FEMEA = 'FEMEA',
}

export const LABEL_SEXO_ANIMAL: Record<SexoAnimal, string> = {
  [SexoAnimal.MACHO]: 'Macho',
  [SexoAnimal.FEMEA]: 'Fêmea',
};

export enum CategoriaAnimal {
  BEZERRO = 'BEZERRO',
  NOVILHA = 'NOVILHA',
  NOVILHO = 'NOVILHO',
  VACA = 'VACA',
  MATRIZ = 'MATRIZ',
  TOURO = 'TOURO',
  BOI = 'BOI',
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
  [CategoriaAnimal.OUTRO]: 'Outro',
};

/** Categorias consideradas na tela de Reprodução (fêmeas em idade reprodutiva + touros). */
export const CATEGORIAS_REPRODUTIVAS: CategoriaAnimal[] = [
  CategoriaAnimal.MATRIZ,
  CategoriaAnimal.VACA,
  CategoriaAnimal.TOURO,
];

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
