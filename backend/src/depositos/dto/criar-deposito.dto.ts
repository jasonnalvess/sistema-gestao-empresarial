import { IsOptional, IsString, MinLength } from 'class-validator';

export class CriarDepositoDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @MinLength(2)
  codigo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  endereco?: string;
}
