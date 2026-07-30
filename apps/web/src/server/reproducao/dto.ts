import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoEventoReprodutivo, SexoAnimal } from '@pecus/shared';

/** Uma cria a ser cadastrada como Animal junto do evento de PARTO. */
export class CriaDto {
  @IsString()
  identificador: string;

  @IsOptional()
  @IsEnum(SexoAnimal)
  sexo?: SexoAnimal;
}

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

  /**
   * Crias a cadastrar na hora (tipo PARTO). Aceita mais de uma porque parto
   * múltiplo é comum em ovinos. Todas herdam espécie/lote da mãe.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriaDto)
  crias?: CriaDto[];

  /**
   * Nº de crias nascidas no parto. Se omitido, assume o nº de crias
   * cadastradas (mínimo 1). Informar explicitamente serve pra quando nascem
   * mais crias do que as identificadas com brinco.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numeroCrias?: number;

  @IsOptional()
  @IsString()
  criaLoteId?: string;
}
