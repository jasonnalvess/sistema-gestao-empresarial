import { TipoInteracaoCRM } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CriarClienteInteracaoDto {
  @IsUUID() clienteId!: string;
  @IsOptional() @IsUUID() oportunidadeId?: string;
  @IsOptional() @IsUUID() agendaEventoId?: string;
  @IsUUID() responsavelId!: string;
  @IsEnum(TipoInteracaoCRM) tipo!: TipoInteracaoCRM;
  @IsOptional() @IsString() assunto?: string;
  @IsString() @MinLength(1) descricao!: string;
  @IsDateString() dataHora!: string;
}
