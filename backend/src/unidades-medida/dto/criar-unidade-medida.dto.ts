import { IsOptional, IsString, MinLength } from 'class-validator';

export class CriarUnidadeMedidaDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @MinLength(1)
  sigla: string;
}
