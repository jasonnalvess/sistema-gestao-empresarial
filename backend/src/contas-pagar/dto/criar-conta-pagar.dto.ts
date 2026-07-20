import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

import { OrigemContaPagar } from '@prisma/client';
import { IsValorMonetario } from '../valor-monetario';

export class CriarContaPagarDto {
  @IsString()
  @MinLength(2)
  descricao: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsEnum(OrigemContaPagar)
  origem?: OrigemContaPagar;

  @IsOptional()
  @IsDateString()
  dataEmissao?: string;

  @IsOptional()
  @IsDateString()
  dataCompetencia?: string;

  @IsDateString()
  dataVencimento: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parcelaAtual?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalParcelas?: number;

  @IsValorMonetario()
  @Min(0.01)
  valorOriginal: number;

  @IsOptional()
  @IsValorMonetario()
  @Min(0)
  valorDesconto?: number;

  @IsOptional()
  @IsValorMonetario()
  @Min(0)
  valorJuros?: number;

  @IsOptional()
  @IsValorMonetario()
  @Min(0)
  valorMulta?: number;

  @IsOptional()
  @IsUUID()
  fornecedorId?: string;

  @IsOptional()
  @IsUUID()
  pedidoCompraId?: string;
}
