import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

import { OrigemMovimentacaoCaixa, TipoMovimentacaoCaixa } from '@prisma/client';

export class CriarMovimentacaoCaixaDto {
  @IsEnum(TipoMovimentacaoCaixa)
  tipo: TipoMovimentacaoCaixa;

  @IsOptional()
  @IsEnum(OrigemMovimentacaoCaixa)
  origem?: OrigemMovimentacaoCaixa;

  @IsString()
  @MinLength(2)
  descricao: string;

  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsDateString()
  dataMovimentacao?: string;
}
