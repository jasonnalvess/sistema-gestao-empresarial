import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TipoEtapaCRM } from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';

export class FiltroCrmEtapasDto extends PaginacaoDto {
  @IsOptional()
  @IsEnum(TipoEtapaCRM)
  tipo?: TipoEtapaCRM;

  @IsOptional()
  @Transform(({ value }: { value: unknown }): unknown => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean()
  ativo?: boolean;
}
