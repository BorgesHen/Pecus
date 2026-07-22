import { IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class CriarPesagemDto {
  @IsString()
  loteId: string;

  @IsDateString()
  data: string;

  @IsNumber()
  @Min(0)
  pesoMedio: number;
}
