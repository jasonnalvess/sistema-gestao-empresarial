import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CriarVendaItemDto {
  @IsUUID()
  produtoId: string;

  @IsNumber()
  @Min(0.01)
  quantidade: number;

  @IsNumber()
  @Min(0)
  valorUnitario: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valorDesconto?: number;

  @IsOptional()
  @IsString()
  observacao?: string;
}
