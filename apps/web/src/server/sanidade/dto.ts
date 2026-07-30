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
}
