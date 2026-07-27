import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AbrirCaixaDto {
  @IsNumber()
  @Min(0)
  saldoInicial: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
