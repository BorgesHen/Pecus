import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FormaPagamento } from '@prisma/client';

export class CriarLancamentoDto {
  @IsString() contaId: string;
  @IsOptional() @IsString() loteId?: string;
  @IsOptional() @IsString() contatoId?: string;
  @IsOptional() @IsString() contaBancariaId?: string;
  @IsOptional() @IsEnum(FormaPagamento) formaPagamento?: FormaPagamento;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() documento?: string;
  @IsNumber() @Min(0.01) valorTotal: number;
  @IsOptional() @IsInt() @Min(1) totalParcelas?: number;
  @IsDateString() dataDocumento: string;
  @IsDateString() dataVencimento: string;
  @IsOptional() @IsDateString() dataLiquidacao?: string;
}

export class LiquidarLancamentoDto {
  @IsDateString() dataLiquidacao: string;
  @IsOptional() @IsString() contaBancariaId?: string;
}

/**
 * Edição de lançamento — o que faltava e obrigava a excluir e relançar.
 *
 * Não deixa mexer em parcelamento: `totalParcelas` e `numeroParcela` definem a
 * série, e mudá-los numa parcela isolada quebraria a relação com as irmãs (a soma
 * das parcelas deixaria de fechar com o total). Pra mudar o parcelamento, exclui e
 * lança de novo.
 */
export class AtualizarLancamentoDto {
  @IsOptional() @IsString() contaId?: string;
  @IsOptional() @IsString() loteId?: string;
  @IsOptional() @IsString() contatoId?: string;
  @IsOptional() @IsString() contaBancariaId?: string;
  @IsOptional() @IsEnum(FormaPagamento) formaPagamento?: FormaPagamento;
  @IsOptional() @IsString() descricao?: string;
  @IsOptional() @IsString() documento?: string;

  /** Valor desta parcela. O total do lançamento acompanha quando é parcela única. */
  @IsOptional() @IsNumber() @Min(0.01) valorParcela?: number;

  @IsOptional() @IsDateString() dataDocumento?: string;
  @IsOptional() @IsDateString() dataVencimento?: string;
}
