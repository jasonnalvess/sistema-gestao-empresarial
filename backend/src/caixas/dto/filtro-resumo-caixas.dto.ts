import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import {
  OrigemMovimentacaoCaixa,
  TipoMovimentacaoCaixa,
} from '@prisma/client';

export class FiltroResumoCaixasDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  caixaId?: string;

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