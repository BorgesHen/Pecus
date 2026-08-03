/** Campo opcional de uma tela de cadastro que a fazenda pode ativar/desativar no painel de Configurações. */
export interface CampoConfiguravel {
  /** "tela.campo" — usado no array Empresa.camposDesativados. */
  chave: string;
  /** Nome do campo no DTO/Prisma da tela. */
  campo: string;
  /** Label exibido no painel de Configurações. */
  label: string;
}

interface TelaCamposConfiguravel {
  label: string;
  campos: CampoConfiguravel[];
}

function campo(tela: string, nomeCampo: string, label: string): CampoConfiguravel {
  return { chave: `${tela}.${nomeCampo}`, campo: nomeCampo, label };
}

/**
 * Telas de cadastro com campos opcionais configuráveis pela fazenda. Só
 * entram aqui campos já opcionais no banco/DTO — desativar nunca pode deixar
 * um formulário sem um campo obrigatório.
 */
export const TELAS_CAMPOS_CONFIGURAVEIS: Record<string, TelaCamposConfiguravel> = {
  lotes: {
    label: 'Lotes',
    campos: [
      campo('lotes', 'pesoMedioEntrada', 'Peso médio de entrada'),
      campo('lotes', 'metodoManejoId', 'Método de manejo'),
      campo('lotes', 'rendimentoCarcaca', 'Rendimento de carcaça'),
      campo('lotes', 'areaId', 'Área'),
      campo('lotes', 'gmdEsperado', 'GMD esperado'),
    ],
  },
  animais: {
    label: 'Animais',
    campos: [
      // A chave segue 'dataNascimento' de propósito: é o que está gravado em
      // Empresa.camposDesativados de quem já desligou o campo. O rótulo mudou
      // porque a tela agora pede idade e deriva a data.
      campo('animais', 'dataNascimento', 'Idade / data de nascimento'),
      campo('animais', 'pesoEntrada', 'Peso de entrada'),
      campo('animais', 'observacao', 'Observação'),
    ],
  },
  gastos: {
    label: 'Gastos',
    campos: [
      campo('gastos', 'loteId', 'Lote'),
      campo('gastos', 'insumoId', 'Insumo'),
      campo('gastos', 'descricao', 'Descrição'),
      campo('gastos', 'quantidade', 'Quantidade'),
      campo('gastos', 'unidade', 'Unidade'),
    ],
  },
  sanidade: {
    label: 'Sanidade',
    campos: [
      campo('sanidade', 'proximaAplicacao', 'Próxima aplicação'),
      campo('sanidade', 'observacao', 'Observação'),
    ],
  },
  reproducao: {
    label: 'Reprodução',
    campos: [
      campo('reproducao', 'resultado', 'Resultado'),
      campo('reproducao', 'observacao', 'Observação'),
    ],
  },
  estoque: {
    label: 'Estoque',
    campos: [campo('estoque', 'estoqueMinimo', 'Estoque mínimo')],
  },
  lancamentos: {
    label: 'Lançamentos financeiros',
    campos: [
      campo('lancamentos', 'loteId', 'Projeto (lote)'),
      campo('lancamentos', 'contatoId', 'Contato'),
      campo('lancamentos', 'contaBancariaId', 'Banco'),
      campo('lancamentos', 'formaPagamento', 'Forma de pagamento'),
      campo('lancamentos', 'descricao', 'Descrição'),
      campo('lancamentos', 'documento', 'Documento'),
    ],
  },
};

/** Todas as chaves válidas ("tela.campo"), pra validar o que a fazenda envia. */
export const CHAVES_CAMPOS_CONFIGURAVEIS: string[] = Object.values(TELAS_CAMPOS_CONFIGURAVEIS).flatMap((tela) =>
  tela.campos.map((c) => c.chave),
);

/** Um campo está ativo se sua chave não estiver na lista de desativados da fazenda. */
export function campoAtivo(camposDesativados: string[] | undefined, chave: string): boolean {
  return !camposDesativados?.includes(chave);
}
