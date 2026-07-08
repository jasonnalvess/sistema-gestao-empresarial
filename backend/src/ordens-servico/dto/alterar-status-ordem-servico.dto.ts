import { IsIn, IsOptional, IsString } from 'class-validator';

export class AlterarStatusOrdemServicoDto {
  @IsIn(['ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'])
  status: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
