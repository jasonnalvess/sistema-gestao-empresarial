import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

import { OrigemContaReceber } from '@prisma/client';

export class CriarContaReceberDto {
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
  @IsEnum(OrigemContaReceber)
  origem?: OrigemContaReceber;

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

  @IsNumber()
  @Min(0.01)
  valorOriginal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorDesconto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorJuros?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorMulta?: number;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  ordemServicoId?: string;
}
