import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoContato } from '@prisma/client';

export class CriarContatoDto {
  @IsEnum(TipoContato) tipo: TipoContato;
  @IsString() nome: string;
  @IsOptional() @IsString() documento?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class AtualizarContatoDto {
  @IsOptional() @IsEnum(TipoContato) tipo?: TipoContato;
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() documento?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsEmail() email?: string;
}
