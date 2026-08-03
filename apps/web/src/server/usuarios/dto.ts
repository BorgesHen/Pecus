import { IsEmail, IsEnum, IsObject, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { NivelAcesso, PapelUsuario, type PermissoesGranulares } from '@pecus/shared';

/**
 * Criação de usuário pelo RESPONSAVEL: cria a conta (se não existir) e a
 * vincula à empresa ativa dele, com papel USUARIO e permissões por módulo.
 */
export class CriarUsuarioDto {
  @IsString()
  nome: string;

  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Usuário deve conter apenas letras, números, ponto, hífen ou underscore.',
  })
  usuario: string;

  @IsEmail()
  email: string;

  // Sem campo de senha de propósito: o sistema gera uma provisória e o usuário
  // define a definitiva no primeiro acesso, então o responsável nunca conhece
  // a senha de ninguém.

  @IsOptional()
  @IsEnum(PapelUsuario)
  papel?: PapelUsuario; // padrão USUARIO; responsável não pode criar ADMIN

  @IsOptional()
  @IsObject()
  permissoes?: PermissoesGranulares;
}

export class AtualizarPermissoesDto {
  @IsObject()
  permissoes: Record<string, NivelAcesso>;
}

/** Edição de nome, usuário (login) e e-mail de um usuário já vinculado. */
export class AtualizarUsuarioDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Usuário deve conter apenas letras, números, ponto, hífen ou underscore.',
  })
  usuario?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
