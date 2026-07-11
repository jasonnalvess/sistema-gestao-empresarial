import { IsOptional, IsString } from 'class-validator';

export class AtualizarInventarioEstoqueDto {
  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
