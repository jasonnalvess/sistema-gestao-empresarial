import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CriarSolicitacaoCadastroDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da empresa é obrigatório' })
  @MinLength(2, {
    message: 'O nome da empresa deve ter no mínimo 2 caracteres',
  })
  @MaxLength(150, {
    message: 'O nome da empresa deve ter no máximo 150 caracteres',
  })
  nomeEmpresa: string;

  @IsOptional()
  @IsString()
  @MaxLength(18, { message: 'CNPJ inválido' })
  cnpjEmpresa?: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome do responsável é obrigatório' })
  @MinLength(2, {
    message: 'O nome do responsável deve ter no mínimo 2 caracteres',
  })
  @MaxLength(150, {
    message: 'O nome do responsável deve ter no máximo 150 caracteres',
  })
  nomeResponsavel: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  @MaxLength(254, { message: 'E-mail inválido' })
  email: string;
}
