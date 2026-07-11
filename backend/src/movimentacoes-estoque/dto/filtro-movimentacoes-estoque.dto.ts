import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { QueryBaseDto } from '../../common/dto/query-base.dto';
import { TipoMovimentacaoEstoqueDto } from './criar-movimentacao-estoque.dto';

export class FiltroMovimentacoesEstoqueDto extends QueryBaseDto {
  @IsOptional()
  @IsUUID()
  produtoId?: string;

  @IsOptional()
  @IsUUID()
  depositoId?: string;

  @IsOptional()
  @IsEnum(TipoMovimentacaoEstoqueDto)
  tipo?: TipoMovimentacaoEstoqueDto;
}
