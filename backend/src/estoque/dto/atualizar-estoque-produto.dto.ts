import { IsNumber, IsOptional, Min } from 'class-validator';

export class AtualizarEstoqueProdutoDto {
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
