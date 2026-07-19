import { IsString, MinLength } from 'class-validator';

export class CriarContaPagarHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}
