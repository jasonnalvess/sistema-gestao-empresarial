import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class EsqueciSenhaDto {
  // @ApiProperty({ example: 'usuario@email.com', description: 'E-mail do usuário para recuperação' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  email: string;
}

export class RedefinirSenhaDto {
  // @ApiProperty({ example: 'token_hex_value', description: 'Token recebido por e-mail' })
  @IsString()
  @IsNotEmpty({ message: 'O token é obrigatório' })
  token: string;

  // @ApiProperty({ example: 'NovaSenha123!', description: 'Nova senha do usuário' })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória' })
  novaSenha: string;

  // @ApiProperty({ example: 'NovaSenha123!', description: 'Confirmação da nova senha' })
  @IsString()
  @IsNotEmpty({ message: 'A confirmação da senha é obrigatória' })
  confirmarSenha: string;
}
