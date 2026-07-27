import { Transform } from 'class-transformer';

import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { StatusCaixa } from '@prisma/client';
import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroCaixasDto extends QueryBaseDto {
  @IsOptional()
  @IsEnum(StatusCaixa)
  status?: StatusCaixa;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  ativo?: boolean;
}
