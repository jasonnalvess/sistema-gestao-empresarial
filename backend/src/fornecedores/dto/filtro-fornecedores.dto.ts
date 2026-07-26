import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroFornecedoresDto extends QueryBaseDto {
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

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  estado?: string;
}
