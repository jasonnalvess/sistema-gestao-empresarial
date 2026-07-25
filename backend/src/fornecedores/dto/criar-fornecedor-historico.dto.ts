import { IsString, MinLength } from 'class-validator';

export class CriarFornecedorHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}
