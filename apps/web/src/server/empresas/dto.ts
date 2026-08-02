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
  @IsBoolean()
  avisoVencimentoSanitarioAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  alturaIdealPastoAtiva?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  camposDesativados?: string[];

  /**
   * Localização da fazenda pra previsão do tempo. Os três vêm juntos: com
   * valor pra definir, todos `null` pra limpar. `@IsOptional()` do
   * class-validator já deixa `null` passar; a coerência entre os três é
   * checada no service.
   */
  @IsOptional()
  @IsString()
  climaLocalNome?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  climaLatitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  climaLongitude?: number | null;
}

/** Tela "Recursos personalizados" (só ADMIN): recursos sob encomenda liberados pra uma fazenda. */
export class AtualizarRecursosPersonalizadosDto {
  @IsArray()
  @IsString({ each: true })
  recursos: string[];
}
