import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;
}

/** Cadastro inicial: cria o usuário RESPONSAVEL + a empresa/fazenda dele. */
export class RegistrarDto {
  @IsString()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsString()
  nomeEmpresa: string;
}
