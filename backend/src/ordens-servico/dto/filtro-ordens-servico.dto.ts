import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FiltroOrdensServicoDto extends PaginacaoDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])
  status?: string;

  @IsOptional()
  @IsIn(['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'])
  prioridade?: string;

  @IsOptional()
  @IsString()
  clienteId?: string;
}
