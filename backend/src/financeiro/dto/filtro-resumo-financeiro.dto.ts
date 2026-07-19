import {
  IsDateString,
  IsOptional,
} from 'class-validator';

export class FiltroResumoFinanceiroDto {
  @IsOptional()
  @IsDateString()
  vencimentoInicio?: string;

  @IsOptional()
  @IsDateString()
  vencimentoFim?: string;
}
