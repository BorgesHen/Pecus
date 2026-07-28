import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CriarPiqueteDto {
  @IsString()
  loteId: string;

  @IsString()
  nome: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHectares?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  alturaIdealCm?: number;
}

export class AtualizarPiqueteDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaHectares?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  alturaIdealCm?: number;
}

export class RegistrarAlturaDto {
  @IsDateString()
  data: string;

  @IsNumber()
  @Min(0)
  alturaCm: number;
}

export class MoverGadoDto {
  @IsDateString()
  data: string;
}
