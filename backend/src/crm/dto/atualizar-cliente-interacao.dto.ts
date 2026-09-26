import { TipoInteracaoCRM } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AtualizarClienteInteracaoDto {
  @ValidateIf((_objeto, valor) => valor !== undefined && valor !== null)
  @IsUUID()
  clienteId?: string | null;
  @ValidateIf((_objeto, valor) => valor !== undefined && valor !== null)
  @IsUUID()
  oportunidadeId?: string | null;
  @ValidateIf((_objeto, valor) => valor !== undefined && valor !== null)
  @IsUUID()
  agendaEventoId?: string | null;
  @IsOptional() @IsUUID() responsavelId?: string;
  @IsOptional() @IsEnum(TipoInteracaoCRM) tipo?: TipoInteracaoCRM;
  @ValidateIf((_objeto, valor) => valor !== undefined && valor !== null)
  @IsString()
  assunto?: string | null;
  @IsOptional() @IsString() @MinLength(1) descricao?: string;
  @IsOptional() @IsDateString() dataHora?: string;
  @IsInt() @Min(0) versaoRegistro!: number;
}
