import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CriarTransferenciaEstoqueDto {
  @IsUUID()
  produtoId: string;

  @IsUUID()
  depositoOrigemId: string;

  @IsUUID()
  depositoDestinoId: string;

  @IsNumber()
  @Min(0.01)
  quantidade: number;

  @IsOptional()
  @IsString()
  documentoReferencia?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
