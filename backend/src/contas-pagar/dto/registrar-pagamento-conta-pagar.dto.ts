import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { FormaPagamento } from '@prisma/client';
import { IsValorMonetario } from '../valor-monetario';

export class RegistrarPagamentoContaPagarDto {
  @IsValorMonetario()
  @Min(0.01)
  valor: number;

  @IsOptional()
  @IsValorMonetario()
  @Min(0)
  desconto?: number;

  @IsOptional()
  @IsValorMonetario()
  @Min(0)
  juros?: number;

  @IsOptional()
  @IsValorMonetario()
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
