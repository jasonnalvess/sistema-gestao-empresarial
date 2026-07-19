import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class FecharCaixaDto {
  @IsNumber()
  @Min(0)
  saldoInformado: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
