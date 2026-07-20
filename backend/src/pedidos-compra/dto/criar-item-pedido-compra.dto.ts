import {
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { IsValorMonetario } from '../../contas-pagar/valor-monetario';

export class CriarItemPedidoCompraDto {
  @IsUUID()
  produtoId: string;

  @IsNumber()
  @Min(0.01)
  quantidadeSolicitada: number;

  @IsNumber()
  @IsValorMonetario()
  @Min(0)
  valorUnitario: number;

  @IsOptional()
  @IsNumber()
  @IsValorMonetario()
  @Min(0)
  valorDesconto?: number;
}
