import { TipoEtapaCRM } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FiltroCrmOportunidadesDto extends PaginacaoDto {
  @IsOptional()
  @IsUUID()
  clienteId?: string;

  @IsOptional()
  @IsUUID()
  etapaId?: string;

  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsEnum(TipoEtapaCRM)
  tipoEtapa?: TipoEtapaCRM;

  @IsOptional()
  @IsDateString()
  previsaoFechamentoInicial?: string;

  @IsOptional()
  @IsDateString()
  previsaoFechamentoFinal?: string;
}
