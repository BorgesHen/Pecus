/** Data de hoje no formato "AAAA-MM-DD", pro atributo `max` de `<input type="date">`. */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
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
