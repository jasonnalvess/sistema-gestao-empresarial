import { Type } from 'class-transformer';

import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsValorMonetario } from '../../contas-pagar/valor-monetario';

export class ReceberItemPedidoCompraDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.01)
  quantidadeRecebida: number;

  @IsOptional()
  @IsNumber()
  @IsValorMonetario()
  @Min(0)
  custoUnitario?: number;
}

export class ReceberPedidoCompraDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceberItemPedidoCompraDto)
  itens: ReceberItemPedidoCompraDto[];

  @IsOptional()
  @IsString()
  documentoReferencia?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
