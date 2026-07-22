import { IsEmail, IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { NivelAcesso, PapelUsuario, PermissoesGranulares } from '@pecus/shared';

/**
 * Criação de usuário pelo RESPONSAVEL: cria a conta (se não existir) e a
 * vincula à empresa ativa dele, com papel USUARIO e permissões por módulo.
 */
export class CriarUsuarioDto {
  @IsString()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

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
