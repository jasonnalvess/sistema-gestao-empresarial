import { IsOptional, IsString, MinLength } from 'class-validator';

export class CriarModuloDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @MinLength(2)
  chave: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
