import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  TipoEventoSanitario,
  FAMACHA_GRAU_MINIMO,
  FAMACHA_GRAU_MAXIMO,
  ECC_MINIMO,
  ECC_MAXIMO,
} from '@pecus/shared';

export class CriarEventoSanitarioDto {
  @IsString() animalId: string;
  @IsEnum(TipoEventoSanitario) tipo: TipoEventoSanitario;
  @IsString() nome: string;
  @IsDateString() data: string;
  @IsOptional() @IsDateString() proximaAplicacao?: string;

  /** Grau FAMACHA 1-5 (manejo ovino). */
  @IsOptional()
  @IsInt()
  @Min(FAMACHA_GRAU_MINIMO)
  @Max(FAMACHA_GRAU_MAXIMO)
  escoreFamacha?: number;

  /** Escore de condição corporal 1-5 (aceita meio ponto, ex: 2.5). */
  @IsOptional()
  @IsNumber()
  @Min(ECC_MINIMO)
  @Max(ECC_MAXIMO)
  escoreCorporal?: number;

  @IsOptional() @IsString() observacao?: string;

  /**
   * Insumo consumido na aplicação. Informar `insumoId` faz três coisas de uma
   * vez: baixa a quantidade do estoque, calcula o custo pelo custo médio do
   * insumo e soma esse custo no custo individual do animal.
   */
  @IsOptional() @IsString() insumoId?: string;

  /** Quantidade aplicada, na unidade escolhida em `unidadeInsumo`. */
  @IsOptional() @IsNumber() @Min(0.000001) quantidadeInsumo?: number;

  /**
   * Unidade da quantidade ("ml"). Pode ser diferente da unidade de cadastro do
   * insumo desde que seja da mesma família — remédio comprado em L e aplicado
   * em ml. Ausente = já vem na unidade do cadastro.
   */
  @IsOptional() @IsString() unidadeInsumo?: string;
}

/** Aplica o mesmo evento em vários animais de uma vez (ex: vacinar o lote inteiro). */
export class AplicarEmMassaDto {
  @IsOptional() @IsString() loteId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) animalIds?: string[];
  @IsEnum(TipoEventoSanitario) tipo: TipoEventoSanitario;
  @IsString() nome: string;
  @IsDateString() data: string;
  @IsOptional() @IsDateString() proximaAplicacao?: string;
  @IsOptional() @IsString() observacao?: string;

  @IsOptional() @IsString() insumoId?: string;

  /** Dose **por animal** — o estoque baixa dose × cabeças. */
  @IsOptional() @IsNumber() @Min(0.000001) quantidadeInsumo?: number;

  @IsOptional() @IsString() unidadeInsumo?: string;
}
