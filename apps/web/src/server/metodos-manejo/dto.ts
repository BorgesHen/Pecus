import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoMetodoManejo } from '@pecus/shared';

export class CriarMetodoManejoDto {
  @IsString()
  @MaxLength(60)
  nome: string;

  @IsOptional()
  @IsEnum(TipoMetodoManejo)
  tipo?: TipoMetodoManejo;
}
