import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { texto, textoOpcional } from '../funcionarios/dto/normalizacao';

export class CriarEstruturaRhDto {
  @Transform(texto)
  @IsString()
  @MinLength(1)
  nome!: string;
  @Transform(textoOpcional)
  @IsOptional()
  @IsString()
  descricao?: string | null;
}
export class EditarEstruturaRhDto {
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Transform(texto)
  @IsString()
  @MinLength(1)
  nome?: string;
  @Transform(textoOpcional)
  @IsOptional()
  @IsString()
  descricao?: string | null;
}
export class FiltroEstruturaRhDto extends PaginacaoDto {
  @IsOptional()
  @Transform(texto)
  @IsString()
  search?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  ativo?: boolean;
}
