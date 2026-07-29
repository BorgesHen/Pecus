import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

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

/** Painel de Configurações: módulos ativos + valores-padrão da fazenda. */
export class AtualizarConfiguracaoEmpresaDto {
  @IsOptional()
  @IsBoolean()
  moduloLotesAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloGastosAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloRelatoriosAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloAnimaisAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloSanidadeAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloReproducaoAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloEstoqueAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloMetodosManejoAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloAreasAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  moduloFinanceiroAtivo?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rendimentoCarcacaPadrao?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sanidadeDiasAvisoVencimento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  alturaIdealPastoPadrao?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  camposDesativados?: string[];
}
