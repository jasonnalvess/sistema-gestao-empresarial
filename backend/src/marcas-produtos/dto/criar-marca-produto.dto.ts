import { IsOptional, IsString, MinLength } from 'class-validator';

export class CriarMarcaProdutoDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
