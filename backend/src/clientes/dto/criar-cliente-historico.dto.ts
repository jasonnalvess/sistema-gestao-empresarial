import { IsString, MinLength } from 'class-validator';

export class CriarClienteHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}
