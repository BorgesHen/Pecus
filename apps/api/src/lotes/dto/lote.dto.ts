import { IsInt, IsOptional, IsString, IsDateString, IsNumber, Min } from 'class-validator';

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
  @IsString()
  metodoManejoId?: string;
}
