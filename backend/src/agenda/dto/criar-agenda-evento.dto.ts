import { IsDateString, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  clienteId?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
