import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import {
  CondicaoPagamentoVenda,
  FormaPagamentoVenda,
  StatusVenda,
} from '@prisma/client';

import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroVendasDto extends QueryBaseDto {
  @IsOptional()
  @IsEnum(StatusVenda)
  status?: StatusVenda;

  @IsOptional()
  @IsEnum(CondicaoPagamentoVenda)
  condicaoPagamento?: CondicaoPagamentoVenda;

  @IsOptional()
  @IsEnum(FormaPagamentoVenda)
  formaPagamento?: FormaPagamentoVenda;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  depositoId?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
