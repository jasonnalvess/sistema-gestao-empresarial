import {
  IsDateString,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class AtualizarAgendaEventoDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsString()
  local?: string;

  @IsOptional()
  @IsString()
  clienteNome?: string;

  @IsOptional()
  @IsString()
  clienteContato?: string;

  @ValidateIf((_objeto, valor) => valor !== undefined && valor !== null)
  @IsString()
  clienteId?: string | null;

  @ValidateIf((_objeto, valor) => valor !== undefined && valor !== null)
  @IsString()
  usuarioId?: string | null;
}
