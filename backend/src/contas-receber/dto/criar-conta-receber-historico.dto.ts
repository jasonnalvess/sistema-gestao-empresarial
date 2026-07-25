import {
  IsString,
  MinLength,
} from 'class-validator';

export class CriarContaReceberHistoricoDto {
  @IsString()
  @MinLength(2)
  descricao: string;
}