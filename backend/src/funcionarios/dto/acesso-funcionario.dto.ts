import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
export class VersaoAcessoFuncionarioDto {
  @IsInt() @Min(0) versaoRegistro!: number;
}
export class CriarAcessoFuncionarioDto extends VersaoAcessoFuncionarioDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;
  @IsString() @MinLength(6) senhaInicial!: string;
  @IsUUID() perfilId!: string;
}
export class VincularAcessoFuncionarioDto extends VersaoAcessoFuncionarioDto {
  @IsUUID() usuarioId!: string;
}
