import { IsInt, Max, Min } from 'class-validator';

/** Limite da coluna Prisma `Int` (int4) usada por `versaoAutorizacao`. */
const VERSAO_AUTORIZACAO_MAXIMA = 2147483647;

export class RedefinirSenhaManualDto {
  @IsInt()
  @Min(0)
  @Max(VERSAO_AUTORIZACAO_MAXIMA)
  versaoAutorizacao!: number;
}
