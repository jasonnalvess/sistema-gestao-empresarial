import { IsDateString, IsOptional, IsString, Min } from 'class-validator';
import { IsValorMonetario } from '../../contas-pagar/valor-monetario';

export class GerarContaOrdemServicoDto {
  @IsDateString()
  dataVencimento: string;

  @IsOptional()
  @IsDateString()
  dataCompetencia?: string;

  @IsValorMonetario()
  @Min(0.01)
  valorOriginal: number;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
