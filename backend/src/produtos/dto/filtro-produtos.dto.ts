import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { QueryBaseDto } from '../../common/dto/query-base.dto';

export class FiltroProdutosDto extends QueryBaseDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;
}
