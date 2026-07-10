import { IsOptional, IsUUID } from 'class-validator';
import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroEstoqueDto extends QueryBaseDto {
  @IsOptional()
  @IsUUID()
  produtoId?: string;

  @IsOptional()
  @IsUUID()
  depositoId?: string;
}
