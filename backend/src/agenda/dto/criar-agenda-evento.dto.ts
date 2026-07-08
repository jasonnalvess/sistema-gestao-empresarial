import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CriarAgendaEventoDto {
  @IsString()
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsDateString()
  dataInicio: string;

  @IsDateString()
  dataFim: string;

  @IsOptional()
  @IsString()
  local?: string;

  @IsOptional()
  @IsString()
  clienteNome?: string;

  @IsOptional()
  @IsString()
  clienteContato?: string;

  @IsOptional()
  @IsIn(['AGENDADO', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO'])
  status?: string;

  @IsString()
  clienteId: string;
}
