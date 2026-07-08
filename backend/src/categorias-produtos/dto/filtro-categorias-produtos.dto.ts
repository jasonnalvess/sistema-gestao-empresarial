import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroCategoriasProdutosDto extends QueryBaseDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;
}
