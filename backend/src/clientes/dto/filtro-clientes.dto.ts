import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FiltroClientesDto extends PaginacaoDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['PF', 'PJ'])
  tipo?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  ativo?: string;
}
