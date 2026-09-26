import { TipoInteracaoCRM } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FiltroClienteInteracoesDto extends PaginacaoDto {
  @IsOptional() @IsUUID() clienteId?: string;
  @IsOptional() @IsUUID() oportunidadeId?: string;
  @IsOptional() @IsUUID() agendaEventoId?: string;
  @IsOptional() @IsUUID() responsavelId?: string;
  @IsOptional() @IsEnum(TipoInteracaoCRM) tipo?: TipoInteracaoCRM;
  @IsOptional() @IsDateString() dataInicial?: string;
  @IsOptional() @IsDateString() dataFinal?: string;
}
