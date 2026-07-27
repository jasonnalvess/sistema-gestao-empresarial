import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CriarOrdemServicoDto {
  @IsString()
  @MinLength(2)
  titulo: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  clienteId: string;

  @IsOptional()
  @IsString()
  agendaEventoId?: string;

  @IsOptional()
  @IsString()
  responsavelId?: string;

  @IsOptional()
  @IsIn(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'])
  prioridade?: string;

  @IsOptional()
  @IsDateString()
  dataPrevista?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
