import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DIAS_VALIDADE_MAXIMO } from '../../common/validacao-comercial/situacao-comercial';

export class RegularizarEmpresaDto {
  @IsInt({ message: 'diasValidade deve ser um número inteiro.' })
  @Min(1, { message: 'diasValidade deve ser no mínimo 1.' })
  @Max(DIAS_VALIDADE_MAXIMO, {
    message: `diasValidade deve ser no máximo ${DIAS_VALIDADE_MAXIMO}.`,
  })
  diasValidade!: number;

  @Transform(({ value }: { value: unknown }) => {
    return typeof value === 'string' ? value.trim() : value;
  })
  @IsString({ message: 'motivo deve ser um texto.' })
  @MinLength(3, { message: 'motivo deve ter no mínimo 3 caracteres.' })
  @MaxLength(500, { message: 'motivo deve ter no máximo 500 caracteres.' })
  motivo!: string;
}
