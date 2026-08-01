import { IsDateString, IsOptional } from 'class-validator';

export class FiltroResumoContasReceberDto {
  @IsOptional()
  @IsDateString()
  vencimentoInicio?: string;

  @IsOptional()
  @IsDateString()
  vencimentoFim?: string;
}
