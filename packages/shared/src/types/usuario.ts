import { PapelUsuario, PermissoesGranulares } from '../enums/papel-usuario';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  createdAt: string;
}

/** Vínculo de um usuário com uma empresa, com papel e permissões. */
export interface UsuarioEmpresa {
  id: string;
  usuarioId: string;
  empresaId: string;
  papel: PapelUsuario;
  permissoes?: PermissoesGranulares | null;
}

/** Payload do JWT / usuário autenticado no contexto da requisição. */
export interface UsuarioAutenticado {
  id: string;
  email: string;
  nome: string;
  /** Papel global: só ADMIN é global; os demais valem por empresa. */
  papelGlobal: PapelUsuario;
  /** Empresa ativa na sessão atual (selecionada no login/troca de fazenda). */
  empresaAtivaId?: string;
  /**
   * Sessão entrou com senha provisória (conta criada pelo responsável ou senha
   * resetada). Enquanto verdadeiro o app só permite definir a senha — as
   * demais rotas são recusadas pelo `autorizar`.
   */
  senhaProvisoria?: boolean;
}
