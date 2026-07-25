import { IsString, MinLength } from 'class-validator';

export class CriarPedidoCompraHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}
