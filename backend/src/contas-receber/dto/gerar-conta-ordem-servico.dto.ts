import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class GerarContaOrdemServicoDto {
  @IsDateString()
  dataVencimento: string;

  @IsOptional()
  @IsDateString()
  dataCompetencia?: string;

  @IsNumber()
  @Min(0.01)
  valorOriginal: number;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}