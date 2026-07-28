/**
 * Remove do dto os campos opcionais que a fazenda desativou no painel de
 * Configurações, pra essa tela ("lotes", "gastos"...). Se um campo desativado
 * vier preenchido mesmo assim, é ignorado silenciosamente — não gera erro.
 */
export function removerCamposDesativados<T extends object>(
  dto: T,
  tela: string,
  camposDesativados: string[],
): T {
  const copia: any = { ...dto };
  for (const chave of camposDesativados) {
    const [t, campo] = chave.split('.');
    if (t === tela && campo in copia) delete copia[campo];
  }
  return copia;
}
