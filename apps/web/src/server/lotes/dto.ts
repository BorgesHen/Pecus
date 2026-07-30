import { IsInt, IsOptional, IsString, IsDateString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { EspecieAnimal } from '@pecus/shared';

export class CriarLoteDto {
  @IsString()
  identificacao: string;

  /** Ausente = BOVINO (comportamento histórico de quem só cria gado). */
  @IsOptional()
  @IsEnum(EspecieAnimal)
  especie?: EspecieAnimal;

  @IsDateString()
  dataAquisicao: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  quantidadeAnimais: number;

  @IsOptional()
  @IsNumber()
  pesoMedioEntrada?: number;

  @IsOptional()
  @IsString()
  metodoManejoId?: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rendimentoCarcaca?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gmdEsperado?: number;
}

export class AtualizarLoteDto {
  @IsOptional()
  @IsString()
  identificacao?: string;

  /** Só aceito enquanto o lote não tem animais — ver lotes.service.ts. */
  @IsOptional()
  @IsEnum(EspecieAnimal)
  especie?: EspecieAnimal;

  @IsOptional()
  @IsDateString()
  dataAquisicao?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  quantidadeAnimais?: number;

  @IsOptional()
  @IsNumber()
  pesoMedioEntrada?: number;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rendimentoCarcaca?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gmdEsperado?: number;
}

/** Troca o método de manejo do lote, fechando a fase atual no histórico e abrindo uma nova. */
export class TrocarMetodoLoteDto {
  @IsString()
  metodoManejoId: string;

  @IsDateString()
  dataTroca: string;
}
