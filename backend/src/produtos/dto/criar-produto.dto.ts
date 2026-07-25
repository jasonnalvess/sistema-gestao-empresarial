import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  codigoBarras?: string;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precoCusto?: number;

  @IsNumber()
  @Min(0)
  precoVenda: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peso?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  altura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  largura?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  comprimento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMinimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMaximo?: number;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @IsOptional()
  @IsUUID()
  unidadeMedidaId?: string;
}
