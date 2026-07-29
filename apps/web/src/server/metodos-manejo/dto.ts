import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoMetodoManejo } from '@pecus/shared';

export class CriarMetodoManejoDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsEnum(TipoMetodoManejo)
  tipo?: TipoMetodoManejo;
}
