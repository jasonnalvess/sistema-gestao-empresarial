import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class PermissaoPerfilDto {
  @IsUUID()
  permissaoId!: string;

  @IsBoolean()
  permitido!: boolean;
}

export class ConfigurarPermissoesDto {
  @IsArray()
  @ArrayMaxSize(103)
  @ArrayUnique((item: PermissaoPerfilDto) => item?.permissaoId)
  @ValidateNested({ each: true })
  @Type(() => PermissaoPerfilDto)
  permissoes!: PermissaoPerfilDto[];
}
