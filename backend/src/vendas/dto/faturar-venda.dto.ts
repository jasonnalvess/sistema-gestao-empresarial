import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class FaturarVendaDto {
  @IsOptional()
  @IsDateString()
  primeiroVencimento?: string;

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
