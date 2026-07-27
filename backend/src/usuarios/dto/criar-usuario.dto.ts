import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export enum TipoUsuarioDto {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_EMPRESA = 'ADMIN_EMPRESA',
  USUARIO_EMPRESA = 'USUARIO_EMPRESA',
}

export class CriarUsuarioDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  senha: string;

  @IsEnum(TipoUsuarioDto)
  tipo: TipoUsuarioDto;

  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
