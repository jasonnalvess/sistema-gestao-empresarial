import { Type } from 'class-transformer';

import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

import { CondicaoPagamentoVenda, FormaPagamentoVenda } from '@prisma/client';

import { CriarVendaItemDto } from './criar-venda-item.dto';

export class AtualizarVendaDto {
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  depositoId?: string;

  @IsOptional()
  @IsDateString()
  dataVenda?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsString()
  observacaoInterna?: string;

  @IsOptional()
  @IsEnum(CondicaoPagamentoVenda)
  condicaoPagamento?: CondicaoPagamentoVenda;

  @IsOptional()
  @IsEnum(FormaPagamentoVenda)
  formaPagamento?: FormaPagamentoVenda;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantidadeParcelas?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  intervaloParcelas?: number;

  @IsOptional()
  @IsDateString()
  primeiroVencimento?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorDesconto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorFrete?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorOutros?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CriarVendaItemDto)
  itens?: CriarVendaItemDto[];
}
