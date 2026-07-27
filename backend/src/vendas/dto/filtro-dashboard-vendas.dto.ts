import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FiltroDashboardVendasDto {
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  depositoId?: string;
}
