import { IsInt, IsOptional, IsString, IsDateString, IsNumber, Min, Max } from 'class-validator';

export class CriarLoteDto {
  @IsString()
  identificacao: string;

  @IsDateString()
  dataAquisicao: string;

  @IsInt()
  @Min(1)
  quantidadeAnimais: number;

  @IsOptional()
  @IsNumber()
  pesoMedioEntrada?: number;

  @IsOptional()
  @IsString()
  metodoManejoId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rendimentoCarcaca?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHectares?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gmdEsperado?: number;
}

export class AtualizarLoteDto {
  @IsOptional()
  @IsString()
  identificacao?: string;

  @IsOptional()
  @IsDateString()
  dataAquisicao?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantidadeAnimais?: number;

  @IsOptional()
  @IsNumber()
  pesoMedioEntrada?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rendimentoCarcaca?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHectares?: number;

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
