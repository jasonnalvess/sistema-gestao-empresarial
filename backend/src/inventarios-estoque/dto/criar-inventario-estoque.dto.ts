import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CriarInventarioEstoqueDto {
  @IsUUID()
  depositoId: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
