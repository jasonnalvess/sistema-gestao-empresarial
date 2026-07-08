import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CriarProdutoDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsNumber()
  @Min(0)
  precoVenda: number;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;
}
