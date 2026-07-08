import { IsOptional, IsString, IsUUID } from 'class-validator';
import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroAuditoriaDto extends QueryBaseDto {
  @IsOptional()
  @IsString()
  acao?: string;

  @IsOptional()
  @IsString()
  entidade?: string;

  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @IsOptional()
  @IsUUID()
  entidadeId?: string;
}
