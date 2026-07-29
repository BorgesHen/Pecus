import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CriarAreaDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHectares?: number;
}

export class AtualizarAreaDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHectares?: number;
}
