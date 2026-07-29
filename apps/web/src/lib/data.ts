/** Data de hoje no formato "AAAA-MM-DD", pro atributo `max` de `<input type="date">`. */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}
