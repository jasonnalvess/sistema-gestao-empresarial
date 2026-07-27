import { IsOptional, IsString, MinLength } from 'class-validator';

export class AtualizarUnidadeMedidaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sigla?: string;
}
