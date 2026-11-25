import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { IsValorMonetario } from '../../contas-pagar/valor-monetario';
import { texto } from '../../funcionarios/dto/normalizacao';
import { Transform } from 'class-transformer';

export class CriarCrmOportunidadeDto {
  @IsUUID()
  clienteId!: string;

  @IsUUID()
  etapaId!: string;

  @IsUUID()
  responsavelId!: string;

  @Transform(texto)
  @IsString()
  @MinLength(1)
  titulo!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsValorMonetario()
  @Min(0)
  valorEstimado?: number;

  @IsOptional()
  @IsDateString()
  previsaoFechamento?: string;
}
