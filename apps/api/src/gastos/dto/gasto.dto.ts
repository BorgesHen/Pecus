import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CriarGastoDto {
  @IsString()
  categoria: string;

  @IsNumber()
  @Min(0)
  valor: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  loteId?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  quantidade?: number;

  @IsOptional()
  @IsString()
  unidade?: string;
}
