import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CriarContaBancariaDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsNumber()
  saldoInicial?: number;

  @IsOptional()
  @IsDateString()
  dataSaldoInicial?: string;
}

export class AtualizarContaBancariaDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  saldoInicial?: number;

  @IsOptional()
  @IsDateString()
  dataSaldoInicial?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
