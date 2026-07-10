import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AtualizarDepositoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  codigo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
