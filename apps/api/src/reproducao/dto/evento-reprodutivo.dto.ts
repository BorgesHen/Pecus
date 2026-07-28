import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoEventoReprodutivo, SexoAnimal } from '@pecus/shared';

export class CriarEventoReprodutivoDto {
  @IsString()
  animalId: string;

  @IsEnum(TipoEventoReprodutivo)
  tipo: TipoEventoReprodutivo;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  resultado?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  /** Linka a um Animal já cadastrado como a cria (tipo PARTO). */
  @IsOptional()
  @IsString()
  criaId?: string;

  /** Alternativa a criaId: cadastra a cria na hora (tipo PARTO). */
  @IsOptional()
  @IsString()
  criaIdentificador?: string;

  @IsOptional()
  @IsEnum(SexoAnimal)
  criaSexo?: SexoAnimal;

  @IsOptional()
  @IsString()
  criaLoteId?: string;
}
