import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  EstadoAcessoFuncionario,
  StatusFuncionario,
  TipoVinculoFuncionario,
} from '@prisma/client';
import { PaginacaoDto } from '../../common/dto/paginacao.dto';
import { texto, textoOpcional, email, digitos, uf } from './normalizacao';

export class DadosPessoaisFuncionarioDto {
  @IsOptional()
  @Transform(digitos)
  @IsString()
  cpf?: string | null;
  @IsOptional()
  @Transform(email)
  @IsEmail()
  emailPessoal?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  telefonePessoal?: string | null;
  @IsOptional()
  @Transform(digitos)
  @IsString()
  cep?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  logradouro?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  numero?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  complemento?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  bairro?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  cidade?: string | null;
  @IsOptional()
  @Transform(uf)
  @IsString()
  uf?: string | null;
}
export class CriarFuncionarioDto extends DadosPessoaisFuncionarioDto {
  @Transform(texto)
  @IsString()
  @MinLength(1)
  nome!: string;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  nomePreferido?: string | null;
  @Transform(texto)
  @IsString()
  @MinLength(1)
  matricula!: string;
  @IsDateString({ strict: true })
  dataAdmissao!: string;
  @IsEnum(TipoVinculoFuncionario)
  tipoVinculo!: TipoVinculoFuncionario;
  @IsOptional()
  @IsUUID()
  cargoId?: string | null;
  @IsOptional()
  @IsUUID()
  departamentoId?: string | null;
  @IsOptional()
  @IsUUID()
  gestorId?: string | null;
  @IsOptional()
  @Transform(email)
  @IsEmail()
  emailCorporativo?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  telefoneCorporativo?: string | null;
}
export class EditarFuncionarioDto {
  @IsInt()
  @Min(0)
  versaoRegistro!: number;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Transform(texto)
  @IsString()
  @MinLength(1)
  nome?: string;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  nomePreferido?: string | null;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @Transform(texto)
  @IsString()
  @MinLength(1)
  matricula?: string;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsDateString({ strict: true })
  dataAdmissao?: string;
  @ValidateIf((_o, v: unknown) => v !== undefined)
  @IsEnum(TipoVinculoFuncionario)
  tipoVinculo?: TipoVinculoFuncionario;
  @IsOptional()
  @IsUUID()
  cargoId?: string | null;
  @IsOptional()
  @IsUUID()
  departamentoId?: string | null;
  @IsOptional()
  @IsUUID()
  gestorId?: string | null;
  @IsOptional()
  @Transform(email)
  @IsEmail()
  emailCorporativo?: string | null;
  @IsOptional()
  @Transform(textoOpcional)
  @IsString()
  telefoneCorporativo?: string | null;
}
export class EditarDadosPessoaisFuncionarioDto extends DadosPessoaisFuncionarioDto {
  @IsInt()
  @Min(0)
  versaoRegistro!: number;
}
export class FiltroFuncionariosDto extends PaginacaoDto {
  @IsOptional()
  @Transform(texto)
  @IsString()
  search?: string;
  @IsOptional()
  @IsEnum(StatusFuncionario)
  status?: StatusFuncionario;
  @IsOptional()
  @IsEnum(TipoVinculoFuncionario)
  tipoVinculo?: TipoVinculoFuncionario;
  @IsOptional()
  @IsUUID()
  cargoId?: string;
  @IsOptional()
  @IsUUID()
  departamentoId?: string;
  @IsOptional()
  @IsUUID()
  gestorId?: string;
  @IsOptional()
  @IsEnum(EstadoAcessoFuncionario)
  acesso?: EstadoAcessoFuncionario;
}
