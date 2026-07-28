import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CriarInsumoDto {
  @IsString()
  nome: string;

  @IsString()
  unidade: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMinimo?: number;
}

export class AtualizarInsumoDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  unidade?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMinimo?: number;
}

/** Consumo manual (saída) — a entrada normalmente já vem do Gasto vinculado. */
export class RegistrarConsumoDto {
  @IsNumber()
  @Min(0.01)
  quantidade: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
