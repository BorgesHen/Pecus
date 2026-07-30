/**
 * Catálogo de recursos sob encomenda, liberados fazenda por fazenda —
 * diferente de MODULOS_CONFIGURAVEIS (que o próprio RESPONSAVEL liga/desliga
 * pra si mesmo), estes só o ADMIN vê e controla, na tela "Recursos
 * personalizados". Serve pra funcionalidades pedidas por um cliente
 * específico, que não fazem sentido pra todo mundo (ex: um cliente que cria
 * galinhas além de gado, outro que cria ovelhas).
 *
 * Pra adicionar um recurso novo: cria a funcionalidade normalmente no
 * código, gateia ela com `recursoPersonalizadoAtivo(empresa, 'sua-chave')`,
 * e inclui a entrada aqui — ela aparece automaticamente na tela do ADMIN
 * pra liberar só pra fazenda que pediu.
 */
export interface RecursoPersonalizado {
  chave: string;
  label: string;
  descricao: string;
}

/** Criação de ovinos junto do gado — habilita espécie no lote/animal, categorias ovinas, FAMACHA/ECC e prolificidade. */
export const RECURSO_OVINOS = 'ovinos';

export const RECURSOS_PERSONALIZADOS: RecursoPersonalizado[] = [
  {
    chave: RECURSO_OVINOS,
    label: 'Ovinos (ovelhas)',
    descricao:
      'Permite marcar lotes e animais como ovinos, com categorias próprias (cordeiro, borrego, ' +
      'marrã, ovelha, carneiro, capão), escore FAMACHA e condição corporal na sanidade, ' +
      'prolificidade na reprodução e custo por kg de carcaça em vez de arroba.',
  },
];

export const CHAVES_RECURSOS_PERSONALIZADOS: string[] = RECURSOS_PERSONALIZADOS.map((r) => r.chave);

/** Recurso está ativo se a chave estiver na lista de recursos liberados da fazenda. */
export function recursoPersonalizadoAtivo(recursos: string[] | undefined | null, chave: string): boolean {
  return Boolean(recursos?.includes(chave));
}
