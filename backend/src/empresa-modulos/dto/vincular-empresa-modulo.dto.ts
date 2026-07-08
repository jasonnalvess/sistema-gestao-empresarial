import { IsUUID } from 'class-validator';

export class VincularEmpresaModuloDto {
  @IsUUID()
  empresaId: string;

  @IsUUID()
  moduloId: string;
}
