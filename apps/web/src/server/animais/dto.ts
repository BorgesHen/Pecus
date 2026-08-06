import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  SexoAnimal,
  CategoriaAnimal,
  StatusAnimal,
  IDADE_MAXIMA_MESES,
  PESO_MAXIMO_KG,
} from '@pecus/shared';

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

  /**
   * Peso na saída. Vira uma pesagem normal na data da saída, e não uma coluna
   * própria: assim "último peso = peso de saída" continua sendo um só número,
   * sem dois lugares livres pra divergir. Opcional porque morte e
   * transferência costumam não ter balança.
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(PESO_MAXIMO_KG)
  pesoSaida?: number;
}

/**
 * Abate do animal — o que a nota do frigorífico devolve dias depois da saída.
 *
 * Pede o **peso de carcaça em kg**, não o rendimento. O rendimento é razão
 * derivada (carcaça ÷ peso vivo) e guardar a razão perderia o kg, que é o que a
 * nota traz e sobre o que o dinheiro é pago. A tela pode aceitar o % como
 * conveniência e converter antes de enviar, mas só o kg chega aqui.
 */
export class RegistrarAbateDto {
  @IsNumber()
  @Min(1)
  @Max(PESO_MAXIMO_KG)
  pesoCarcaca: number;

  @IsDateString()
  dataAbate: string;

  /**
   * Peso vivo na balança do frigorífico. Opcional porque nem toda nota traz —
   * sem ele o rendimento usa o peso de saída da fazenda, que inclui a quebra de
   * transporte e por isso dá alguns pontos menos.
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(PESO_MAXIMO_KG)
  pesoVivoAbate?: number;

  /** Tipificação, desconto, hematoma — o que a nota registra em texto. */
  @IsOptional()
  @IsString()
  observacaoAbate?: string;

  /**
   * Valor TOTAL recebido pela venda (R$). A tela aceita digitar o R$/@ e converte
   * antes de enviar — o R$/@ é razão derivada, e guardar a razão perderia o total,
   * que é o que entra no caixa.
   *
   * Informar isto cria (ou atualiza) um lançamento de RECEITA em aberto, que
   * aparece em contas a receber e é liquidado quando o dinheiro cair.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  valorRecebido?: number;

  /** Comprador — vira o contato do lançamento de receita. */
  @IsOptional()
  @IsString()
  contatoId?: string;
}

/** Pesagem individual do animal — a base do GMD individual. */
export class CriarPesagemAnimalDto {
  @IsDateString()
  data: string;

  @IsNumber()
  @Min(1)
  @Max(PESO_MAXIMO_KG)
  peso: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
