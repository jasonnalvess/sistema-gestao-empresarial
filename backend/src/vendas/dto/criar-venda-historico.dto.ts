import {
  IsString,
  MinLength,
} from 'class-validator';

export class CriarVendaHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}
