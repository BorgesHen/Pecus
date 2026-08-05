/**
 * "Que dia é hoje" — e por que isso não é óbvio.
 *
 * O sistema roda em servidor UTC (Vercel) e é usado no Brasil, UTC-3. Depois das
 * 21h daqui, `new Date().toISOString()` já devolve a data de **amanhã**. Isso
 * produz uma família de erros que só aparece à noite:
 *
 * - uma parcela que vence hoje é marcada "Atrasado";
 * - o `max` de um campo de data passa a aceitar amanhã;
 * - um formulário abre com a data de amanhã preenchida.
 *
 * A referência certa é o dia no fuso da fazenda, calculado com o banco de fusos
 * do próprio motor JavaScript — que também acerta se o horário de verão voltar.
 */

/**
 * Fuso das fazendas atendidas. Constante, e não configuração, porque o sistema
 * é de uso nacional e todo o resto (rótulos, formato de número, moeda) também é.
 * Se um dia atender fazenda fora do Brasil, isto vira campo da Empresa.
 */
export const FUSO_FAZENDA = 'America/Sao_Paulo';

/**
 * Hoje no fuso da fazenda, em "AAAA-MM-DD".
 *
 * Usa `en-CA` porque é o locale cujo formato curto já é exatamente
 * "AAAA-MM-DD" — evita montar a string na mão a partir das partes.
 */
export function hojeNaFazenda(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_FAZENDA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/**
 * A parte da data de um valor que representa **um dia** (vencimento, data de
 * pesagem, data de entrada), não um instante.
 *
 * Esses campos são gravados como meia-noite UTC, então recortar os 10 primeiros
 * caracteres do ISO devolve o dia pretendido sem passar por conversão de fuso —
 * que é o que desloca a data em um dia.
 */
export function diaISO(valor: string | Date): string {
  return (valor instanceof Date ? valor.toISOString() : String(valor)).slice(0, 10);
}

/** O dia de `valor` já passou, comparado ao dia de hoje na fazenda. */
export function diaJaPassou(valor: string | Date, agora: Date = new Date()): boolean {
  return diaISO(valor) < hojeNaFazenda(agora);
}
