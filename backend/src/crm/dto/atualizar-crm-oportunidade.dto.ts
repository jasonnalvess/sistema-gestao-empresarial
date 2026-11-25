import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsValorMonetario } from '../../contas-pagar/valor-monetario';
import { texto } from '../../funcionarios/dto/normalizacao';

export class AtualizarCrmOportunidadeDto {
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @Transform(texto)
  @IsString()
  @MinLength(1)
  titulo?: string;

  @ValidateIf((_objeto, valor) => valor !== undefined && valor !== null)
  @IsString()
  descricao?: string | null;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsValorMonetario()
  @Min(0)
  valorEstimado?: number;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsDateString()
  previsaoFechamento?: string;

  @ValidateIf((_objeto, valor) => valor !== undefined)
  @IsUUID()
  responsavelId?: string;

  @IsInt()
  @Min(0)
  versaoRegistro!: number;
}
