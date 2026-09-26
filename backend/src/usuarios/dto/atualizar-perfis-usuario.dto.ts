import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class AtualizarPerfisUsuarioDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  perfisIds!: string[];
}
