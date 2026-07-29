import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoEventoSanitario } from '@pecus/shared';

export class CriarEventoSanitarioDto {
  @IsString() animalId: string;
  @IsEnum(TipoEventoSanitario) tipo: TipoEventoSanitario;
  @IsString() nome: string;
  @IsDateString() data: string;
  @IsOptional() @IsDateString() proximaAplicacao?: string;
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
