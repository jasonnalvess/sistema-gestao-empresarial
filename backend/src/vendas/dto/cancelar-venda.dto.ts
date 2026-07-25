import {
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CancelarVendaDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  motivo?: string;
}
