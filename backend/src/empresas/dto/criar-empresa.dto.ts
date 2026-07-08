import { IsOptional, IsString, MinLength } from 'class-validator';

export class CriarEmpresaDto {
  @IsString()
  @MinLength(2)
  nome: string;

  @IsOptional()
  @IsString()
  cnpj?: string;
}
