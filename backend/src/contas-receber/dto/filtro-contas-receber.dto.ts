import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { OrigemContaReceber, StatusContaReceber } from '@prisma/client';

import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroContasReceberDto extends QueryBaseDto {
  @IsOptional()
  @IsEnum(StatusContaReceber)
  status?: StatusContaReceber;

  @IsOptional()
  @IsEnum(OrigemContaReceber)
  origem?: OrigemContaReceber;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  ordemServicoId?: string;

  @IsOptional()
  @IsUUID()
  vendaId?: string;

  @IsOptional()
  @IsDateString()
  vencimentoInicio?: string;

  @IsOptional()
  @IsDateString()
  vencimentoFim?: string;
}
