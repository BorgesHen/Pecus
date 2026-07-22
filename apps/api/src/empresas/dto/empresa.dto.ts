import { IsOptional, IsString } from 'class-validator';

export class CriarEmpresaDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  documento?: string;
}

export class AtualizarEmpresaDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  documento?: string;
}
