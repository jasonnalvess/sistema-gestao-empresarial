import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

import { FormaRecebimento } from '@prisma/client';
import { IsValorMonetario } from '../../contas-pagar/valor-monetario';

export class RegistrarRecebimentoContaReceberDto {
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
