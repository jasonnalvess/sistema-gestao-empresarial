import { IsString, MinLength } from 'class-validator';
export class TrocarSenhaDto {
  @IsString() senhaAtual!: string;
  @IsString() @MinLength(6) novaSenha!: string;
}
