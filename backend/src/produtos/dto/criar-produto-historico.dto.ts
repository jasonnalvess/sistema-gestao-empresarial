import { IsString, MinLength } from 'class-validator';

export class CriarProdutoHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}
