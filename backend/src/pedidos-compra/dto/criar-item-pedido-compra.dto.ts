import {
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CriarItemPedidoCompraDto {
  @IsUUID()
  produtoId: string;

  @IsNumber()
  @Min(0.01)
  quantidadeSolicitada: number;

  @IsNumber()
  @Min(0)
  valorUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorDesconto?: number;
}
