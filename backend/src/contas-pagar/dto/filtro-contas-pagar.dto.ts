import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import {
  OrigemContaPagar,
  StatusContaPagar,
} from '@prisma/client';

import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroContasPagarDto extends QueryBaseDto {
  @IsOptional()
  @IsEnum(StatusContaPagar)
  status?: StatusContaPagar;

  @IsOptional()
  @IsEnum(OrigemContaPagar)
  origem?: OrigemContaPagar;

  @IsOptional()
  @IsUUID()
  fornecedorId?: string;

  @IsOptional()
  @IsUUID()
  pedidoCompraId?: string;

  @IsOptional()
  @IsDateString()
  vencimentoInicio?: string;

  @IsOptional()
  @IsDateString()
  vencimentoFim?: string;
}
