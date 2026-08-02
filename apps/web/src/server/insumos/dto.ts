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

/**
 * Entrada manual de estoque. A entrada normal vem de um Gasto com insumo +
 * quantidade (compra), que já lança o movimento e fica com `gastoId`
 * preenchido. Esta é para o que entra sem passar por um gasto: saldo inicial
 * ao começar a usar o sistema, ajuste de inventário, produção própria,
 * devolução, doação.
 */
export class RegistrarEntradaDto {
  @IsNumber()
  @Min(0.01)
  quantidade: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
