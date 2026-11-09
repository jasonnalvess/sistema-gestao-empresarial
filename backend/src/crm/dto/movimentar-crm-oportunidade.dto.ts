import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { texto } from '../../funcionarios/dto/normalizacao';

export class MovimentarCrmOportunidadeDto {
  @IsUUID()
  etapaId!: string;

  @IsInt()
  @Min(0)
  versaoRegistro!: number;

  @IsOptional()
  @Transform(texto)
  @IsString()
  motivoPerda?: string;
}
