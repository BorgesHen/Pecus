import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { SexoAnimal, CategoriaAnimal, StatusAnimal } from '@pecus/shared';

export class CriarAnimalDto {
  @IsString()
  loteId: string;

  @IsString()
  identificador: string;

  @IsEnum(SexoAnimal)
  sexo: SexoAnimal;

  @IsEnum(CategoriaAnimal)
  categoria: CategoriaAnimal;

  @IsDateString()
  dataEntrada: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @IsNumber()
  pesoEntrada?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class AtualizarAnimalDto {
  @IsOptional()
  @IsString()
  loteId?: string;

  @IsOptional()
  @IsString()
  identificador?: string;

  @IsOptional()
  @IsEnum(SexoAnimal)
  sexo?: SexoAnimal;

  @IsOptional()
  @IsEnum(CategoriaAnimal)
  categoria?: CategoriaAnimal;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @IsNumber()
  pesoEntrada?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

/** "Dar saída" no animal: venda, morte ou transferência — mantém o histórico, não remove. */
export class DarSaidaAnimalDto {
  @IsEnum(StatusAnimal)
  status: StatusAnimal;

  @IsDateString()
  dataSaida: string;

  @IsOptional()
  @IsString()
  motivoSaida?: string;
}
