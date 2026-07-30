import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CriarConviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  observacao?: string;
}
