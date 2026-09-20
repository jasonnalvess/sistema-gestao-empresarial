import { IsInt, IsUUID, Min } from 'class-validator';

export class VincularVendaCrmOportunidadeDto {
  @IsUUID()
  vendaId!: string;

  @IsInt()
  @Min(0)
  versaoRegistro!: number;
}
