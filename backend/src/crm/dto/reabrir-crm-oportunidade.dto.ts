import { IsInt, IsUUID, Min } from 'class-validator';

export class ReabrirCrmOportunidadeDto {
  @IsUUID()
  etapaId!: string;

  @IsInt()
  @Min(0)
  versaoRegistro!: number;
}
