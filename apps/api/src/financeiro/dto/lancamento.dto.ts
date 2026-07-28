import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FormaPagamento } from '@prisma/client';

export class CriarLancamentoDto {
  @IsString()
  contaId: string;

  @IsOptional()
  @IsString()
  loteId?: string;

  @IsOptional()
  @IsString()
  contatoId?: string;

  @IsOptional()
  @IsString()
  contaBancariaId?: string;

  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsNumber()
  @Min(0.01)
  valorTotal: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalParcelas?: number;

  @IsDateString()
  dataDocumento: string;

  @IsDateString()
  dataVencimento: string;

  @IsOptional()
  @IsDateString()
  dataLiquidacao?: string;
}

export class LiquidarLancamentoDto {
  @IsDateString()
  dataLiquidacao: string;

  @IsOptional()
  @IsString()
  contaBancariaId?: string;
}
