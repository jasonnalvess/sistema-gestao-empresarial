import { IsInt, Min } from 'class-validator';

export class DesvincularVendaCrmOportunidadeDto {
  @IsInt()
  @Min(0)
  versaoRegistro!: number;
}
