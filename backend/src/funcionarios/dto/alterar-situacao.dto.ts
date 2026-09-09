import { StatusFuncionario } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, Min, ValidateIf } from 'class-validator';

export enum AcaoAcessoFuncionario {
  PRESERVAR = 'PRESERVAR',
  SUSPENDER = 'SUSPENDER',
}
export class AlterarSituacaoFuncionarioDto {
  @IsInt()
  @Min(0)
  versaoRegistro!: number;

  @IsEnum(StatusFuncionario)
  status!: StatusFuncionario;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsEnum(AcaoAcessoFuncionario)
  acaoAcesso?: AcaoAcessoFuncionario;

  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsDateString({ strict: true })
  dataDesligamento?: string;
}
