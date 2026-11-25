import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { texto } from '../../funcionarios/dto/normalizacao';

export class AtualizarCrmEtapaDto {
  @ValidateIf((_objeto, valor) => valor !== undefined)
  @Transform(texto)
  @IsString()
  @MinLength(1)
  nome?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
