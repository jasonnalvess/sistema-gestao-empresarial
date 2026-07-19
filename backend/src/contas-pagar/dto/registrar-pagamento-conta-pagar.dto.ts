import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { FormaPagamento } from '@prisma/client';

export class RegistrarPagamentoContaPagarDto {
  @IsNumber()
  @Min(0.01)
  valor: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  desconto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  juros?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  multa?: number;

  @IsEnum(FormaPagamento)
  formaPagamento: FormaPagamento;

  @IsOptional()
  @IsDateString()
  dataPagamento?: string;

  @IsOptional()
  @IsUUID()
  caixaId?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}