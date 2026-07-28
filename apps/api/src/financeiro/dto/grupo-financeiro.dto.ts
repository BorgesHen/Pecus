import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { NaturezaFinanceira } from '@prisma/client';

export class CriarGrupoFinanceiroDto {
  @IsEnum(NaturezaFinanceira)
  natureza: NaturezaFinanceira;

  @IsString()
  codigo: string;

  @IsString()
  nome: string;

  @IsOptional()
  @IsInt()
  ordem?: number;
}

export class AtualizarGrupoFinanceiroDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsInt()
  ordem?: number;
}
