import { IsOptional, IsString, MinLength } from 'class-validator';

export class CriarOrdemServicoHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;

  @IsOptional()
  @IsString()
  statusAnterior?: string;

  @IsOptional()
  @IsString()
  statusNovo?: string;
}
