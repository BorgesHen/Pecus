import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { SexoAnimal, CategoriaAnimal, StatusAnimal, IDADE_MAXIMA_MESES } from '@pecus/shared';

export class CriarAnimalDto {
  @IsString()
  loteId: string;

  @IsString()
  identificador: string;

  @IsEnum(SexoAnimal)
  sexo: SexoAnimal;

  @IsEnum(CategoriaAnimal)
  categoria: CategoriaAnimal;

  @IsDateString()
  dataEntrada: string;

  /**
   * Idade em meses na data de entrada. A data de nascimento é derivada daqui no
   * service — ver idade-animal.ts pra o porquê de não guardar a idade crua.
   * A tela oferece meses/anos, mas converte pra meses antes de enviar.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(IDADE_MAXIMA_MESES)
  idadeMeses?: number;

  @IsOptional()
  @IsNumber()
  pesoEntrada?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class AtualizarAnimalDto {
  @IsOptional()
  @IsString()
  loteId?: string;

  @IsOptional()
  @IsString()
  identificador?: string;

  @IsOptional()
  @IsEnum(SexoAnimal)
  sexo?: SexoAnimal;

  @IsOptional()
  @IsEnum(CategoriaAnimal)
  categoria?: CategoriaAnimal;

  /** Idade em meses; recalculada contra a data de entrada já gravada do animal. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(IDADE_MAXIMA_MESES)
  idadeMeses?: number;

  @IsOptional()
  @IsNumber()
  pesoEntrada?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}

/** "Dar saída" no animal: venda, morte ou transferência — mantém o histórico, não remove. */
export class DarSaidaAnimalDto {
  @IsEnum(StatusAnimal)
  status: StatusAnimal;

  @IsDateString()
  dataSaida: string;

  @IsOptional()
  @IsString()
  motivoSaida?: string;
}
