import { IsString } from 'class-validator';

export class CriarMetodoManejoDto {
  @IsString()
  nome: string;
}
