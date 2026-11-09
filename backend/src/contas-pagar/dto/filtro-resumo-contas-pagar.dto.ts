import { IsDateString, IsOptional } from 'class-validator';

export class FiltroResumoContasPagarDto {
  @IsOptional()
  @IsDateString()
  vencimentoInicio?: string;

  @IsOptional()
  @IsDateString()
  vencimentoFim?: string;
}
