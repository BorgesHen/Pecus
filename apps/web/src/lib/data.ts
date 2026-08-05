import { hojeNaFazenda } from '@pecus/shared';

/**
 * Data de hoje no formato "AAAA-MM-DD", pro atributo `max` de
 * `<input type="date">` e pro valor inicial dos formulários.
 *
 * Usa o dia no fuso da fazenda, e não `toISOString()`: depois das 21h de Brasília
 * o ISO já devolve amanhã, e o formulário abria com a data errada enquanto o
 * `max` passava a aceitar um dia que ainda não chegou.
 */
export function hojeISO(): string {
  return hojeNaFazenda();
}

/**
 * Formata uma data do backend pro padrão brasileiro.
 *
 * O backend manda `2026-08-03T00:00:00.000Z`. Jogar isso direto no `new Date()`
 * e formatar volta **um dia atrás** em qualquer fuso negativo (no Brasil,
 * 02/08/2026): a meia-noite UTC ainda é o dia anterior aqui. Por isso a data
 * é ancorada ao meio-dia, que é imune a fuso e a horário de verão.
 */
export function brData(data?: string | Date | null): string {
  if (!data) return '—';
  const iso = (data instanceof Date ? data.toISOString() : String(data)).slice(0, 10);
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');
}

/**
 * Formata data **e hora** de um instante real (`createdAt` e afins).
 *
 * Aqui a conversão de fuso é justamente o que se quer, ao contrário do
 * `brData`: um registro gravado às 21h de Brasília tem que aparecer como 21h,
 * e não como a meia-noite UTC do dia seguinte. Por isso não ancora nada — só
 * converte pro fuso de quem está lendo.
 */
export function brDataHora(data?: string | Date | null): string {
  if (!data) return '—';
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
