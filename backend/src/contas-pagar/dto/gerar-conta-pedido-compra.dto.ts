import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class GerarContaPedidoCompraDto {
  @IsDateString()
  dataVencimento: string;

  @IsOptional()
  @IsDateString()
  dataCompetencia?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
