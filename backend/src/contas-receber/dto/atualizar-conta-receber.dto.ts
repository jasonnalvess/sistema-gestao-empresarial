import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class AtualizarContaReceberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  descricao?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsDateString()
  dataEmissao?: string;

  @IsOptional()
  @IsDateString()
  dataCompetencia?: string;

  @IsOptional()
  @IsDateString()
  dataVencimento?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parcelaAtual?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalParcelas?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  valorOriginal?: number;

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
