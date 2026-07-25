import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroProdutosDto extends QueryBaseDto {
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
  @IsUUID()
  categoriaId?: string;

  @IsOptional()
  @IsUUID()
  marcaId?: string;

  @IsOptional()
  @IsUUID()
  unidadeMedidaId?: string;
}
