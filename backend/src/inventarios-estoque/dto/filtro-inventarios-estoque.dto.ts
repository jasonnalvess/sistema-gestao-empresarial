import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StatusInventarioEstoque } from '@prisma/client';
import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroInventariosEstoqueDto extends QueryBaseDto {
  @IsOptional()
  @IsEnum(StatusInventarioEstoque)
  status?: StatusInventarioEstoque;

  @IsOptional()
  @IsUUID()
  depositoId?: string;
}
