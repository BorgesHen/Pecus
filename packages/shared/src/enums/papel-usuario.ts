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
}

/** Nível de acesso de um usuário a um módulo. */
export enum NivelAcesso {
  NENHUM = 'nenhum',
  VER = 'ver',
  EDITAR = 'editar',
}

/** Estrutura do JSON de permissões granulares em UsuarioEmpresa.permissoes */
export type PermissoesGranulares = Partial<Record<ModuloSistema, NivelAcesso>>;
