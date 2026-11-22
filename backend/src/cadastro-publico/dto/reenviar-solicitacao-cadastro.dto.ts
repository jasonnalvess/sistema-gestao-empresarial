import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ReenviarSolicitacaoCadastroDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  @MaxLength(254, { message: 'E-mail inválido' })
  email: string;
}
