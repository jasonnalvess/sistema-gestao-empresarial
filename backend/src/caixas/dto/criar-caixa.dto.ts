import {
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CriarCaixaDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsString()
  @MinLength(1)
  codigo: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
