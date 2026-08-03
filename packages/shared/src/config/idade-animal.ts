/**
 * Idade de animal — digitada como idade, guardada como data de nascimento.
 *
 * No cadastro de gado comprado quase nunca se sabe a data de nascimento; se
 * sabe a idade ("esse boi tem 18 meses"). Mas guardar a idade como número
 * apodrece o registro: um ano depois o banco continuaria dizendo 18 meses.
 * Então a tela pede idade, o sistema deriva a data de nascimento a partir dela,
 * e toda exibição de idade é recalculada a partir dessa data — assim ela
 * envelhece junto com o animal.
 *
 * Bônus: as crias nascidas na fazenda (evento de PARTO) já entram com a data
 * exata, e a idade delas aparece pelo mesmo caminho, sem exceção no código.
 */

export type UnidadeIdade = 'MESES' | 'ANOS';

export const MESES_POR_UNIDADE: Record<UnidadeIdade, number> = {
  MESES: 1,
  ANOS: 12,
};

export const LABEL_UNIDADE_IDADE: Record<UnidadeIdade, string> = {
  MESES: 'meses',
  ANOS: 'anos',
};

/** 50 anos — folgado pra qualquer espécie, e trava digitação absurda. */
export const IDADE_MAXIMA_MESES = 600;

function partes(dataISO: string): [number, number, number] {
  const [ano, mes, dia] = dataISO.slice(0, 10).split('-').map(Number);
  return [ano, mes, dia];
}

function formatar(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Volta N meses de uma data (ISO `AAAA-MM-DD`), sem passar do fim do mês.
 * Sem o ajuste de dia, 31/03 menos 1 mês cairia em 03/03 no JavaScript — o
 * Date estoura o dia inexistente pro mês seguinte.
 */
export function subtrairMeses(dataISO: string, meses: number): string {
  const [ano, mes, dia] = partes(dataISO);
  const indiceAlvo = mes - 1 - Math.trunc(meses);
  const anoAlvo = ano + Math.floor(indiceAlvo / 12);
  const mesAlvo = ((indiceAlvo % 12) + 12) % 12;
  const ultimoDiaDoMes = new Date(Date.UTC(anoAlvo, mesAlvo + 1, 0)).getUTCDate();
  return formatar(anoAlvo, mesAlvo + 1, Math.min(dia, ultimoDiaDoMes));
}

/** Data de nascimento equivalente a uma idade numa data de referência. */
export function dataNascimentoPorIdade(
  referenciaISO: string,
  idade: number,
  unidade: UnidadeIdade = 'MESES',
): string {
  return subtrairMeses(referenciaISO, Math.max(0, idade) * MESES_POR_UNIDADE[unidade]);
}

/** Meses completos entre nascimento e a referência (padrão: hoje). */
export function idadeEmMeses(nascimentoISO: string, referenciaISO: string): number {
  const [anoNasc, mesNasc, diaNasc] = partes(nascimentoISO);
  const [anoRef, mesRef, diaRef] = partes(referenciaISO);
  let meses = (anoRef - anoNasc) * 12 + (mesRef - mesNasc);
  // O mês só conta quando o "aniversário do mês" já passou.
  if (diaRef < diaNasc) meses -= 1;
  return Math.max(0, meses);
}

/** "18 meses", "1 ano e 6 meses", "2 anos" — como o produtor fala. */
export function descreverIdade(meses: number): string {
  const total = Math.max(0, Math.trunc(meses));
  if (total === 0) return 'menos de 1 mês';
  if (total < 12) return `${total} ${total === 1 ? 'mês' : 'meses'}`;

  const anos = Math.floor(total / 12);
  const resto = total % 12;
  const parteAnos = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  if (resto === 0) return parteAnos;
  return `${parteAnos} e ${resto} ${resto === 1 ? 'mês' : 'meses'}`;
}

/** Idade atual de um animal, pronta pra exibir. Nulo = sem data de nascimento. */
export function idadeDoAnimal(
  animal: { dataNascimento?: string | null },
  hojeISO: string,
): { meses: number; texto: string } | null {
  if (!animal.dataNascimento) return null;
  const meses = idadeEmMeses(animal.dataNascimento, hojeISO);
  return { meses, texto: descreverIdade(meses) };
}
