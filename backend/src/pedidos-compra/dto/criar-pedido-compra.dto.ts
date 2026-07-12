import { Type } from 'class-transformer';

import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { CriarItemPedidoCompraDto } from './criar-item-pedido-compra.dto';

export class CriarPedidoCompraDto {
  @IsUUID()
  fornecedorId: string;

  @IsUUID()
  depositoId: string;

  @IsOptional()
  @IsDateString()
  dataPrevistaEntrega?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsString()
  observacaoInterna?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorDesconto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorFrete?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorOutros?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CriarItemPedidoCompraDto)
  itens: CriarItemPedidoCompraDto[];
}
