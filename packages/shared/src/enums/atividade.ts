import { ModuloSistema } from './papel-usuario';

/**
 * Tipo de ação registrada na trilha de atividades.
 *
 * MOVIMENTACAO é separada de ATUALIZACAO porque é o que se procura no dia a
 * dia: gado que trocou de piquete, animal que saiu do rebanho, insumo que
 * entrou ou saiu, parcela liquidada. Tudo isso é tecnicamente um update, mas
 * ninguém abre o histórico pra ver "um update".
 */
export enum AcaoAtividade {
  CRIACAO = 'CRIACAO',
  ATUALIZACAO = 'ATUALIZACAO',
  EXCLUSAO = 'EXCLUSAO',
  MOVIMENTACAO = 'MOVIMENTACAO',
}

export const LABEL_ACAO_ATIVIDADE: Record<AcaoAtividade, string> = {
  [AcaoAtividade.CRIACAO]: 'Cadastro',
  [AcaoAtividade.ATUALIZACAO]: 'Edição',
  [AcaoAtividade.EXCLUSAO]: 'Exclusão',
  [AcaoAtividade.MOVIMENTACAO]: 'Movimentação',
};

/** Tipo de registro afetado pela ação. Vai no campo `entidade` do log. */
export enum EntidadeAtividade {
  LOTE = 'lote',
  ANIMAL = 'animal',
  PESAGEM = 'pesagem',
  AREA = 'area',
  PIQUETE = 'piquete',
  GASTO = 'gasto',
  INSUMO = 'insumo',
  EVENTO_SANITARIO = 'evento-sanitario',
  EVENTO_REPRODUTIVO = 'evento-reprodutivo',
  LANCAMENTO = 'lancamento',
  PLANO_CONTAS = 'plano-contas',
  CONTA_BANCARIA = 'conta-bancaria',
  CONTATO = 'contato',
  METODO_MANEJO = 'metodo-manejo',
  USUARIO = 'usuario',
  CONFIGURACAO = 'configuracao',
  FAZENDA = 'fazenda',
}

export const LABEL_ENTIDADE_ATIVIDADE: Record<EntidadeAtividade, string> = {
  [EntidadeAtividade.LOTE]: 'Lotes',
  [EntidadeAtividade.ANIMAL]: 'Animais',
  [EntidadeAtividade.PESAGEM]: 'Pesagens',
  [EntidadeAtividade.AREA]: 'Áreas',
  [EntidadeAtividade.PIQUETE]: 'Piquetes',
  [EntidadeAtividade.GASTO]: 'Gastos',
  [EntidadeAtividade.INSUMO]: 'Estoque',
  [EntidadeAtividade.EVENTO_SANITARIO]: 'Sanidade',
  [EntidadeAtividade.EVENTO_REPRODUTIVO]: 'Reprodução',
  [EntidadeAtividade.LANCAMENTO]: 'Lançamentos',
  [EntidadeAtividade.PLANO_CONTAS]: 'Plano de contas',
  [EntidadeAtividade.CONTA_BANCARIA]: 'Bancos',
  [EntidadeAtividade.CONTATO]: 'Contatos',
  [EntidadeAtividade.METODO_MANEJO]: 'Métodos de manejo',
  [EntidadeAtividade.USUARIO]: 'Usuários',
  [EntidadeAtividade.CONFIGURACAO]: 'Configurações',
  [EntidadeAtividade.FAZENDA]: 'Fazenda',
};

/**
 * Módulo que governa quem pode LER o histórico de cada entidade: quem já
 * enxerga a tela enxerga o histórico dela.
 *
 * `null` = não tem módulo próprio (configurações e dados da fazenda). Nesses
 * casos só o responsável e o ADMIN leem — é a mesma regra do feed geral, que
 * junta tudo e por isso não pode ser liberado por módulo.
 */
export const MODULO_DA_ENTIDADE: Record<EntidadeAtividade, ModuloSistema | null> = {
  [EntidadeAtividade.LOTE]: ModuloSistema.LOTES,
  [EntidadeAtividade.ANIMAL]: ModuloSistema.ANIMAIS,
  [EntidadeAtividade.PESAGEM]: ModuloSistema.PESAGENS,
  [EntidadeAtividade.AREA]: ModuloSistema.AREAS,
  [EntidadeAtividade.PIQUETE]: ModuloSistema.PIQUETES,
  [EntidadeAtividade.GASTO]: ModuloSistema.GASTOS,
  [EntidadeAtividade.INSUMO]: ModuloSistema.ESTOQUE,
  [EntidadeAtividade.EVENTO_SANITARIO]: ModuloSistema.SANIDADE,
  [EntidadeAtividade.EVENTO_REPRODUTIVO]: ModuloSistema.REPRODUCAO,
  [EntidadeAtividade.LANCAMENTO]: ModuloSistema.FINANCEIRO,
  [EntidadeAtividade.PLANO_CONTAS]: ModuloSistema.FINANCEIRO,
  [EntidadeAtividade.CONTA_BANCARIA]: ModuloSistema.FINANCEIRO,
  [EntidadeAtividade.CONTATO]: ModuloSistema.FINANCEIRO,
  [EntidadeAtividade.METODO_MANEJO]: ModuloSistema.METODOS_MANEJO,
  [EntidadeAtividade.USUARIO]: ModuloSistema.USUARIOS,
  [EntidadeAtividade.CONFIGURACAO]: null,
  [EntidadeAtividade.FAZENDA]: null,
};

/**
 * Nome de coluna → nome que a pessoa usa.
 *
 * O log guarda em `detalhes.camposAlterados` os campos que vieram no PATCH, que
 * são os nomes do banco. Mostrar "areaHectares" no histórico não diz nada a
 * quem cuida do gado — o que responde "o que mudou?" é "Tamanho (ha)".
 */
export const LABEL_CAMPO_ATIVIDADE: Record<string, string> = {
  // Rótulos que o fallback automático deixava feio ("Escore famacha", "Peso medio").
  escoreFamacha: 'Escore FAMACHA',
  escoreCorporal: 'Escore de condição corporal',
  pesoMedio: 'Peso médio',
  quantidadeInsumo: 'Quantidade do insumo',
  unidadeInsumo: 'Unidade do insumo',
  // Comuns a várias telas
  nome: 'Nome',
  identificacao: 'Identificação',
  identificador: 'Identificação',
  observacao: 'Observação',
  descricao: 'Descrição',
  codigo: 'Código',
  ordem: 'Ordem',
  ativo: 'Ativo',
  documento: 'Documento',
  telefone: 'Telefone',
  email: 'E-mail',
  tipo: 'Tipo',
  natureza: 'Natureza',
  data: 'Data',
  quantidade: 'Quantidade',
  unidade: 'Unidade',
  valor: 'Valor',

  // Lotes
  especie: 'Espécie',
  dataAquisicao: 'Data de aquisição',
  quantidadeAnimais: 'Quantidade de animais',
  pesoMedioEntrada: 'Peso médio de entrada',
  metodoManejoId: 'Método de manejo',
  areaId: 'Área',
  rendimentoCarcaca: 'Rendimento de carcaça',
  gmdEsperado: 'GMD esperado',
  pesoMedioCompra: 'Peso médio de compra',
  valorKgCompra: 'Valor do kg na compra',
  fretePorCabeca: 'Frete por cabeça',
  comissaoPorCabeca: 'Comissão por cabeça',

  // Animais
  loteId: 'Lote',
  sexo: 'Sexo',
  categoria: 'Categoria',
  dataEntrada: 'Data de entrada',
  idadeMeses: 'Idade',
  pesoEntrada: 'Peso de entrada',
  status: 'Status',
  dataSaida: 'Data de saída',
  motivoSaida: 'Motivo da saída',

  // Áreas e piquetes
  areaHectares: 'Tamanho (ha)',
  alturaIdealCm: 'Altura ideal do pasto',

  // Estoque
  estoqueMinimo: 'Estoque mínimo',

  // Financeiro
  grupoId: 'Grupo',
  contaId: 'Conta',
  contatoId: 'Contato',
  contaBancariaId: 'Banco',
  formaPagamento: 'Forma de pagamento',
  saldoInicial: 'Saldo inicial',
  dataSaldoInicial: 'Data do saldo inicial',
  valorTotal: 'Valor total',
  dataVencimento: 'Vencimento',
  dataDocumento: 'Data do documento',
  dataLiquidacao: 'Liquidação',

  // Usuários
  usuario: 'Usuário (login)',
  papel: 'Papel',
  permissoes: 'Permissões',

  // Configurações da fazenda
  moduloLotesAtivo: 'Módulo Lotes',
  moduloGastosAtivo: 'Módulo Gastos',
  moduloRelatoriosAtivo: 'Módulo Relatórios',
  moduloAnimaisAtivo: 'Módulo Animais',
  moduloSanidadeAtivo: 'Módulo Sanidade',
  moduloReproducaoAtivo: 'Módulo Reprodução',
  moduloEstoqueAtivo: 'Módulo Estoque',
  moduloMetodosManejoAtivo: 'Módulo Métodos de manejo',
  moduloAreasAtivo: 'Módulo Áreas',
  moduloFinanceiroAtivo: 'Módulo Financeiro',
  rendimentoCarcacaPadrao: 'Rendimento de carcaça padrão',
  sanidadeDiasAvisoVencimento: 'Dias de aviso de vencimento',
  alturaIdealPastoPadrao: 'Altura ideal do pasto (padrão)',
  avisoVencimentoSanitarioAtivo: 'Aviso de vencimento sanitário',
  alturaIdealPastoAtiva: 'Uso da altura ideal do pasto',
  camposDesativados: 'Campos desativados',
  recursosPersonalizados: 'Recursos personalizados',
  climaLocalNome: 'Localização do clima',
  climaLatitude: 'Latitude do clima',
  climaLongitude: 'Longitude do clima',
};

/**
 * Rótulo do campo, com sobra pra campo que eu não tenha mapeado: quebra o
 * camelCase em palavras em vez de mostrar "algumCampoNovo" cru.
 */
export function rotuloCampoAtividade(campo: string): string {
  const conhecido = LABEL_CAMPO_ATIVIDADE[campo];
  if (conhecido) return conhecido;
  const palavras = campo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return palavras.charAt(0).toUpperCase() + palavras.slice(1);
}

export const ENTIDADES_ATIVIDADE = Object.values(EntidadeAtividade);
export const ACOES_ATIVIDADE = Object.values(AcaoAtividade);

/** Valida texto vindo da query string antes de usar como filtro. */
export function ehEntidadeAtividade(valor: string): valor is EntidadeAtividade {
  return (ENTIDADES_ATIVIDADE as string[]).includes(valor);
}

export function ehAcaoAtividade(valor: string): valor is AcaoAtividade {
  return (ACOES_ATIVIDADE as string[]).includes(valor);
}
