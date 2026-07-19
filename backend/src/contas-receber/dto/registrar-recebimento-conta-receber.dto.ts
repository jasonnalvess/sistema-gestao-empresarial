import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { FormaRecebimento } from '@prisma/client';

export class RegistrarRecebimentoContaReceberDto {
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

  @IsEnum(FormaRecebimento)
  formaRecebimento: FormaRecebimento;

  @IsOptional()
  @IsDateString()
  dataRecebimento?: string;

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