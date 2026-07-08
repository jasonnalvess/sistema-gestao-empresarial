import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum TipoMovimentacaoEstoqueDto {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  AJUSTE = 'AJUSTE',
  INVENTARIO = 'INVENTARIO',
}

export class CriarMovimentacaoEstoqueDto {
  @IsUUID()
  produtoId: string;

  @IsEnum(TipoMovimentacaoEstoqueDto)
  tipo: TipoMovimentacaoEstoqueDto;

  @IsNumber()
  @Min(0.01)
  quantidade: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
