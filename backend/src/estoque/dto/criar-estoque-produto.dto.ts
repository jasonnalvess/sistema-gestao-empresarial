import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CriarEstoqueProdutoDto {
  @IsUUID()
  produtoId: string;

  @IsUUID()
  depositoId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantidadeAtual?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMinimo?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estoqueMaximo?: number;
}
