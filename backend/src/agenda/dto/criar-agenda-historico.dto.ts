import { IsString, MinLength } from 'class-validator';

export class CriarAgendaHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}
