import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CriarContaFinanceiraDto {
  @IsString() grupoId: string;
  @IsString() codigo: string;
  @IsString() nome: string;
}

export class AtualizarContaFinanceiraDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
