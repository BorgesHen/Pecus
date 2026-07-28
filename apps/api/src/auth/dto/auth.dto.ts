import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  usuario: string;

  @IsString()
  @MinLength(6)
  senha: string;
}

export class TrocarEmpresaDto {
  @IsString()
  empresaId: string;
}

/** Cadastro inicial: cria o usuário RESPONSAVEL + a empresa/fazenda dele. */
export class RegistrarDto {
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

  @IsString()
  @MinLength(6)
  senha: string;

  @IsString()
  nomeEmpresa: string;
}
