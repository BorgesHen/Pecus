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
  /**
   * Mínimo bem menor que o de antes (0,01) porque a quantidade agora pode vir
   * na unidade de cadastro do insumo: 5 ml de um produto em litro é 0,005.
   */
  @IsNumber()
  @Min(0.000001)
  quantidade: number;

  /**
   * Unidade em que a quantidade foi digitada. Ausente = já vem na unidade de
   * cadastro do insumo (comportamento de antes, preservado pra não quebrar quem
   * chama sem escolher unidade).
   */
  @IsOptional()
  @IsString()
  unidade?: string;

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
  @Min(0.000001)
  quantidade: number;

  /** Unidade digitada; ausente = unidade de cadastro do insumo. */
  @IsOptional()
  @IsString()
  unidade?: string;

  /**
   * Quanto se pagou por esta entrada (R$). Opcional porque entrada de ajuste,
   * saldo inicial ou doação não tem preço — mas é este valor que alimenta o
   * custo médio do insumo e, por consequência, o custo do remédio aplicado num
   * animal. Sem ele a aplicação é registrada com custo em branco.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorTotal?: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
