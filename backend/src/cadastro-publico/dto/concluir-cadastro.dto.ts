import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Limite efetivo do bcrypt: 72 bytes UTF-8. Não são 72 caracteres: acentos
 * ocupam 2 bytes e emojis 4, então uma senha curta pode exceder o limite. O
 * bcrypt ignora silenciosamente todo o excedente, tanto no hash quanto na
 * verificação.
 */
export const LIMITE_BYTES_SENHA = 72;

/** Mínimo de caracteres preservado do contrato anterior. */
export const MINIMO_CARACTERES_SENHA = 8;

/**
 * Detecta surrogate UTF-16 isolado, ou seja, string que não é UTF-8 bem
 * formado. Medir bytes com `encodeURI` (como faz `@IsByteLength`) lançaria
 * `URIError` e converteria um payload inválido em HTTP 500.
 */
function possuiSurrogateIsolado(valor: string): boolean {
  for (let indice = 0; indice < valor.length; indice += 1) {
    const codigo = valor.charCodeAt(indice);

    if (codigo >= 0xd800 && codigo <= 0xdbff) {
      const seguinte = valor.charCodeAt(indice + 1);
      const parValido = seguinte >= 0xdc00 && seguinte <= 0xdfff;

      if (!parValido) return true;

      // Consome o par substituto válido.
      indice += 1;
      continue;
    }

    // Um low surrogate só é válido logo após um high surrogate, que já teria
    // sido consumido no ramo acima.
    if (codigo >= 0xdc00 && codigo <= 0xdfff) return true;
  }

  return false;
}

/**
 * Valida o limite de 72 bytes UTF-8 do bcrypt de forma fail-closed: entradas
 * não textuais, vazias e com surrogate isolado são rejeitadas, e a medição
 * usa `Buffer.byteLength`, que nunca lança exceção.
 */
@ValidatorConstraint({ name: 'limiteBytesSenha', async: false })
export class LimiteBytesSenhaConstraint implements ValidatorConstraintInterface {
  validate(valor: unknown): boolean {
    if (typeof valor !== 'string') return false;
    if (valor.length === 0) return false;
    if (possuiSurrogateIsolado(valor)) return false;

    return Buffer.byteLength(valor, 'utf8') <= LIMITE_BYTES_SENHA;
  }

  defaultMessage(): string {
    return `O valor deve ter no máximo ${LIMITE_BYTES_SENHA} bytes (UTF-8)`;
  }
}

const MENSAGEM_SENHA_BYTES = `A senha deve ter no máximo ${LIMITE_BYTES_SENHA} bytes (UTF-8)`;
const MENSAGEM_CONFIRMACAO_BYTES = `A confirmação da senha deve ter no máximo ${LIMITE_BYTES_SENHA} bytes (UTF-8)`;

/**
 * Conclusão do cadastro público (V3.6.5, Fase B).
 *
 * Somente o token e a senha inicial são recebidos: empresa, CNPJ e
 * responsável vêm da solicitação persistida na Fase A. A senha é definida
 * pelo próprio administrador no formulário de conclusão.
 */
export class ConcluirCadastroDto {
  @IsString()
  @IsNotEmpty({ message: 'O token é obrigatório' })
  @MaxLength(200, { message: 'Token inválido' })
  token: string;

  // 72 caracteres multibyte podem chegar a 288 bytes; por isso o limite é
  // medido em bytes UTF-8 e não em caracteres.
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @MinLength(MINIMO_CARACTERES_SENHA, {
    message: `A senha deve ter no mínimo ${MINIMO_CARACTERES_SENHA} caracteres`,
  })
  @Validate(LimiteBytesSenhaConstraint, { message: MENSAGEM_SENHA_BYTES })
  senha: string;

  @IsString()
  @IsNotEmpty({ message: 'A confirmação da senha é obrigatória' })
  @Validate(LimiteBytesSenhaConstraint, {
    message: MENSAGEM_CONFIRMACAO_BYTES,
  })
  confirmarSenha: string;
}
