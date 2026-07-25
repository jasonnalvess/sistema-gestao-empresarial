import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ContarItemInventarioDto {
  @IsNumber()
  @Min(0)
  quantidadeContada: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
