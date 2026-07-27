import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email: string;

  @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(1, { message: 'Informe a senha' })
  senha: string;
}
