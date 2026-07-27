import { IsEnum, IsOptional, IsUUID } from 'class-validator';

import { StatusPedidoCompra } from '@prisma/client';
import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroPedidosCompraDto extends QueryBaseDto {
  @IsOptional()
  @IsEnum(StatusPedidoCompra)
  status?: StatusPedidoCompra;

  @IsOptional()
  @IsUUID()
  fornecedorId?: string;

  @IsOptional()
  @IsUUID()
  depositoId?: string;
}
