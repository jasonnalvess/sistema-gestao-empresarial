import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { TipoEtapaCRM } from '@prisma/client';
import { texto } from '../../funcionarios/dto/normalizacao';

export class CriarCrmEtapaDto {
  @Transform(texto)
  @IsString()
  @MinLength(1)
  nome!: string;

  @IsInt()
  @Min(0)
  ordem!: number;

  @IsEnum(TipoEtapaCRM)
  tipo!: TipoEtapaCRM;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
