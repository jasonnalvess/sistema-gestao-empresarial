import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { QueryBaseDto } from '../../common/dto/query-base.dto';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../../common/enums/auditoria.enum';

export const CAMPOS_ORDENACAO_AUDITORIA = [
  'createdAt',
  'acao',
  'entidade',
] as const;

export type CampoOrdenacaoAuditoria =
  (typeof CAMPOS_ORDENACAO_AUDITORIA)[number];

export class FiltroAuditoriaDto extends QueryBaseDto {
  @IsOptional()
  @IsEnum(AuditoriaAcao)
  acao?: AuditoriaAcao;

  @IsOptional()
  @IsEnum(AuditoriaEntidade)
  entidade?: AuditoriaEntidade;

  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  @IsOptional()
  @IsUUID()
  entidadeId?: string;

  @IsOptional()
  @IsIn(CAMPOS_ORDENACAO_AUDITORIA)
  sortBy?: CampoOrdenacaoAuditoria = 'createdAt';
}
