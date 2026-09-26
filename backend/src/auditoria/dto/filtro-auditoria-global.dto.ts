import { IsOptional, IsUUID } from 'class-validator';
import { FiltroAuditoriaDto } from './filtro-auditoria.dto';

export class FiltroAuditoriaGlobalDto extends FiltroAuditoriaDto {
  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
