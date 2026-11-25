import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ConcluirCadastroDto,
  LIMITE_BYTES_SENHA,
  LimiteBytesSenhaConstraint,
  MINIMO_CARACTERES_SENHA,
} from './concluir-cadastro.dto';

describe('ConcluirCadastroDto', () => {
  const validar = (dados: object) =>
    validate(plainToInstance(ConcluirCadastroDto, dados), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  /**
   * Propriedades inválidas em ordem estável. A validação nunca pode lançar
   * exceção: surrogate isolado é erro de validação (HTTP 400), não `URIError`
   * (HTTP 500).
   */
  const invalidas = async (dados: object) =>
    (await validar(dados)).map((erro) => erro.property).sort();

  const base = {
    token: 'a'.repeat(64),
    senha: 'SenhaForte123',
    confirmarSenha: 'SenhaForte123',
  };

  const comSenha = (senha: string) => ({
    ...base,
    senha,
    confirmarSenha: senha,
  });

  describe('contrato básico', () => {
    it('aceita token e senha válidos', async () => {
      await expect(validar(base)).resolves.toHaveLength(0);
    });

    it('rejeita token ausente', async () => {
      await expect(
        validar({ senha: base.senha, confirmarSenha: base.senha }),
      ).resolves.not.toHaveLength(0);
    });

    it('rejeita token vazio', async () => {
      await expect(validar({ ...base, token: '' })).resolves.not.toHaveLength(
        0,
      );
    });

    it('rejeita token acima do limite', async () => {
      await expect(
        validar({ ...base, token: 'a'.repeat(201) }),
      ).resolves.not.toHaveLength(0);
    });

    it('rejeita senha ausente', async () => {
      await expect(
        validar({ token: base.token, confirmarSenha: base.senha }),
      ).resolves.not.toHaveLength(0);
    });

    it('rejeita confirmação ausente', async () => {
      await expect(
        validar({ token: base.token, senha: base.senha }),
      ).resolves.not.toHaveLength(0);
    });

    it('rejeita senha não textual', async () => {
      await expect(
        validar({ ...base, senha: 12345678, confirmarSenha: 12345678 }),
      ).resolves.not.toHaveLength(0);
    });

    it('rejeita campo extra (whitelist estrita)', async () => {
      await expect(
        validar({ ...base, empresaId: 'uuid-qualquer' }),
      ).resolves.not.toHaveLength(0);
    });

    it('não compara senha e confirmação (responsabilidade do service)', async () => {
      await expect(
        invalidas({
          ...base,
          senha: 'SenhaForte123',
          confirmarSenha: 'OutraSenha123',
        }),
      ).resolves.toEqual([]);
    });
  });

  describe('mínimo de caracteres', () => {
    it(`rejeita ${MINIMO_CARACTERES_SENHA - 1} caracteres`, async () => {
      // `confirmarSenha` não tem regra mínima própria: o service exige que
      // seja igual a `senha`, que já passou pelo mínimo.
      await expect(invalidas(comSenha('1234567'))).resolves.toEqual(['senha']);
    });

    it(`aceita exatamente ${MINIMO_CARACTERES_SENHA} caracteres`, async () => {
      await expect(invalidas(comSenha('12345678'))).resolves.toEqual([]);
    });

    it('conta o mínimo em caracteres, aceitando 8 acentuados', async () => {
      await expect(invalidas(comSenha('á'.repeat(8)))).resolves.toEqual([]);
    });

    it('rejeita 7 acentuados mesmo tendo 14 bytes', async () => {
      await expect(invalidas(comSenha('á'.repeat(7)))).resolves.toEqual([
        'senha',
      ]);
    });
  });

  describe('limite de bytes UTF-8 do bcrypt', () => {
    it('aceita 72 caracteres ASCII (72 bytes)', async () => {
      const senha = 'a'.repeat(72);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(LIMITE_BYTES_SENHA);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([]);
    });

    it('rejeita 73 caracteres ASCII (73 bytes)', async () => {
      const senha = 'a'.repeat(73);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(73);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('aceita 36 caracteres "á" (72 bytes)', async () => {
      const senha = 'á'.repeat(36);
      expect(senha).toHaveLength(36);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(72);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([]);
    });

    it('rejeita 37 caracteres "á" (74 bytes)', async () => {
      const senha = 'á'.repeat(37);
      expect(senha).toHaveLength(37);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(74);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('rejeita 40 caracteres "á" (80 bytes)', async () => {
      const senha = 'á'.repeat(40);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(80);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('aceita 18 emojis (72 bytes)', async () => {
      const senha = '😀'.repeat(18);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(72);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([]);
    });

    it('rejeita 19 emojis (76 bytes)', async () => {
      const senha = '😀'.repeat(19);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(76);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('rejeita 72 emojis (288 bytes), caso aceito pela validação em caracteres', async () => {
      const senha = '😀'.repeat(72);
      // Emoji ocupa 2 code units UTF-16: `.length` seria 144.
      expect([...senha]).toHaveLength(72);
      expect(Buffer.byteLength(senha, 'utf8')).toBe(288);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('aplica o limite em confirmarSenha mesmo com senha válida', async () => {
      await expect(
        invalidas({
          ...base,
          senha: 'a'.repeat(72),
          confirmarSenha: 'á'.repeat(40),
        }),
      ).resolves.toEqual(['confirmarSenha']);
    });

    it('informa o limite em bytes na mensagem de erro', async () => {
      const erros = await validar(comSenha('😀'.repeat(19)));
      const senhaErro = erros.find((erro) => erro.property === 'senha');

      expect(Object.values(senhaErro?.constraints ?? {})).toEqual([
        `A senha deve ter no máximo ${LIMITE_BYTES_SENHA} bytes (UTF-8)`,
      ]);
    });
  });

  describe('surrogate isolado', () => {
    it('rejeita high surrogate isolado sem lançar exceção', async () => {
      await expect(invalidas(comSenha(`senha123\uD800`))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('rejeita low surrogate isolado sem lançar exceção', async () => {
      await expect(invalidas(comSenha(`senha123\uDC00`))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('rejeita surrogate isolado vindo de JSON sem lançar exceção', async () => {
      const senha = JSON.parse('"senha123\\ud800"') as string;

      expect(senha).toHaveLength(9);
      await expect(invalidas(comSenha(senha))).resolves.toEqual([
        'confirmarSenha',
        'senha',
      ]);
    });

    it('aceita par surrogate válido (emoji) até o limite', async () => {
      await expect(invalidas(comSenha('😀'.repeat(18)))).resolves.toEqual([]);
    });
  });
});

describe('LimiteBytesSenhaConstraint', () => {
  const constraint = new LimiteBytesSenhaConstraint();

  it('rejeita entradas não textuais sem lançar exceção', () => {
    expect(constraint.validate(12345678)).toBe(false);
    expect(constraint.validate(null)).toBe(false);
    expect(constraint.validate(undefined)).toBe(false);
    expect(constraint.validate(['a'])).toBe(false);
    expect(constraint.validate({ senha: 'a'.repeat(8) })).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(constraint.validate('')).toBe(false);
  });

  it('aceita exatamente 72 bytes e rejeita 73', () => {
    expect(constraint.validate('á'.repeat(36))).toBe(true);
    expect(constraint.validate('á'.repeat(37))).toBe(false);
  });

  it('mede bytes UTF-8 e não caracteres', () => {
    expect('á'.repeat(36)).toHaveLength(36);
    expect(Buffer.byteLength('á'.repeat(36), 'utf8')).toBe(72);
    expect(constraint.validate('😀'.repeat(72))).toBe(false);
  });

  it('rejeita surrogate isolado sem lançar exceção', () => {
    expect(() => constraint.validate('\uD800')).not.toThrow();
    expect(constraint.validate('\uD800')).toBe(false);
    expect(constraint.validate('\uDC00')).toBe(false);
    expect(constraint.validate('a\uD800b')).toBe(false);
  });

  it('aceita par surrogate válido', () => {
    expect(constraint.validate('😀')).toBe(true);
  });

  it('expõe mensagem padrão com o limite em bytes', () => {
    expect(constraint.defaultMessage()).toBe(
      `O valor deve ter no máximo ${LIMITE_BYTES_SENHA} bytes (UTF-8)`,
    );
  });
});
