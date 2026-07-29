export enum PapelUsuario {
  ADMIN = 'ADMIN',
  RESPONSAVEL = 'RESPONSAVEL',
  USUARIO = 'USUARIO',
}

/**
 * Módulos do sistema sobre os quais um USUARIO pode receber permissões
 * granulares definidas pelo RESPONSAVEL da empresa.
 */
export enum ModuloSistema {
  LOTES = 'lotes',
  PESAGENS = 'pesagens',
  GASTOS = 'gastos',
  RELATORIOS = 'relatorios',
  USUARIOS = 'usuarios',
  ANIMAIS = 'animais',
  SANIDADE = 'sanidade',
  REPRODUCAO = 'reproducao',
  ESTOQUE = 'estoque',
  METODOS_MANEJO = 'metodos-manejo',
  PIQUETES = 'piquetes',
  AREAS = 'areas',
  FINANCEIRO = 'financeiro',
}

export const LABEL_MODULO_SISTEMA: Record<ModuloSistema, string> = {
  [ModuloSistema.LOTES]: 'Lotes',
  [ModuloSistema.PESAGENS]: 'Pesagens',
  [ModuloSistema.GASTOS]: 'Gastos',
  [ModuloSistema.RELATORIOS]: 'Relatórios',
  [ModuloSistema.USUARIOS]: 'Usuários',
  [ModuloSistema.ANIMAIS]: 'Animais',
  [ModuloSistema.SANIDADE]: 'Sanidade',
  [ModuloSistema.REPRODUCAO]: 'Reprodução',
  [ModuloSistema.ESTOQUE]: 'Estoque',
  [ModuloSistema.METODOS_MANEJO]: 'Métodos de manejo',
  [ModuloSistema.PIQUETES]: 'Piquetes',
  [ModuloSistema.AREAS]: 'Áreas',
  [ModuloSistema.FINANCEIRO]: 'Financeiro',
};

/**
 * Módulos que a fazenda pode ativar/desativar por completo no painel de
 * Configurações. Usuários/Pesagens são o núcleo do sistema e não têm toggle.
 */
export const MODULOS_CONFIGURAVEIS: ModuloSistema[] = [
  ModuloSistema.LOTES,
  ModuloSistema.GASTOS,
  ModuloSistema.RELATORIOS,
  ModuloSistema.ANIMAIS,
  ModuloSistema.SANIDADE,
  ModuloSistema.REPRODUCAO,
  ModuloSistema.ESTOQUE,
  ModuloSistema.METODOS_MANEJO,
  ModuloSistema.AREAS,
  ModuloSistema.FINANCEIRO,
];

/**
 * Nome do campo booleano em Empresa que guarda se o módulo está ativo —
 * usada tanto pelo ModuloAtivoGuard (back) quanto pelo filtro de menu (front),
 * uma fonte só de verdade.
 */
export const CAMPO_MODULO_ATIVO: Partial<Record<ModuloSistema, string>> = {
  [ModuloSistema.LOTES]: 'moduloLotesAtivo',
  [ModuloSistema.GASTOS]: 'moduloGastosAtivo',
  [ModuloSistema.RELATORIOS]: 'moduloRelatoriosAtivo',
  [ModuloSistema.ANIMAIS]: 'moduloAnimaisAtivo',
  [ModuloSistema.SANIDADE]: 'moduloSanidadeAtivo',
  [ModuloSistema.REPRODUCAO]: 'moduloReproducaoAtivo',
  [ModuloSistema.ESTOQUE]: 'moduloEstoqueAtivo',
  [ModuloSistema.METODOS_MANEJO]: 'moduloMetodosManejoAtivo',
  [ModuloSistema.AREAS]: 'moduloAreasAtivo',
  [ModuloSistema.FINANCEIRO]: 'moduloFinanceiroAtivo',
};

/** Nível de acesso de um usuário a um módulo. */
export enum NivelAcesso {
  NENHUM = 'nenhum',
  VER = 'ver',
  EDITAR = 'editar',
}

/** Estrutura do JSON de permissões granulares em UsuarioEmpresa.permissoes */
export type PermissoesGranulares = Partial<Record<ModuloSistema, NivelAcesso>>;

/** Configuração da fazenda: módulos ativos + valores-padrão (painel de Configurações). */
export interface ConfiguracaoEmpresa {
  moduloLotesAtivo: boolean;
  moduloGastosAtivo: boolean;
  moduloRelatoriosAtivo: boolean;
  moduloAnimaisAtivo: boolean;
  moduloSanidadeAtivo: boolean;
  moduloReproducaoAtivo: boolean;
  moduloEstoqueAtivo: boolean;
  moduloMetodosManejoAtivo: boolean;
  moduloAreasAtivo: boolean;
  moduloFinanceiroAtivo: boolean;
  rendimentoCarcacaPadrao: number;
  sanidadeDiasAvisoVencimento: number;
  alturaIdealPastoPadrao: number;
  camposDesativados: string[];
}
