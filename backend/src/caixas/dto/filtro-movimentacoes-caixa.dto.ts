import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { OrigemMovimentacaoCaixa, TipoMovimentacaoCaixa } from '@prisma/client';

import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroMovimentacoesCaixaDto extends QueryBaseDto {
  @IsOptional()
  @IsUUID()
  caixaId?: string;

  @IsOptional()
  @IsUUID()
  aberturaCaixaId?: string;

  @IsOptional()
  @IsEnum(TipoMovimentacaoCaixa)
  tipo?: TipoMovimentacaoCaixa;

  @IsOptional()
  @IsEnum(OrigemMovimentacaoCaixa)
  origem?: OrigemMovimentacaoCaixa;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}
