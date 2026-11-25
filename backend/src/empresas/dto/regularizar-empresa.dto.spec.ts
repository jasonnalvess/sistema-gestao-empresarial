import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegularizarEmpresaDto } from './regularizar-empresa.dto';

const validar = async (dados: Record<string, unknown>) =>
  validate(plainToInstance(RegularizarEmpresaDto, dados), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('RegularizarEmpresaDto', () => {
  it('aceita diasValidade entre 1 e 3650 e motivo de 3 a 500 caracteres', async () => {
    await expect(
      validar({ diasValidade: 30, motivo: 'Contrato regularizado' }),
    ).resolves.toHaveLength(0);
    await expect(
      validar({ diasValidade: 1, motivo: 'abc' }),
    ).resolves.toHaveLength(0);
    await expect(
      validar({ diasValidade: 3650, motivo: 'a'.repeat(500) }),
    ).resolves.toHaveLength(0);
  });

  it.each([0, 3651, 1.5, '30', null])(
    'recusa diasValidade inválido: %s',
    async (diasValidade) => {
      await expect(
        validar({ diasValidade, motivo: 'Contrato regularizado' }),
      ).resolves.not.toHaveLength(0);
    },
  );

  it.each(['', 'ab', '   ', 'a'.repeat(501)])(
    'recusa motivo inválido',
    async (motivo) => {
      await expect(
        validar({ diasValidade: 30, motivo }),
      ).resolves.not.toHaveLength(0);
    },
  );

  it('remove espaços do motivo válido', async () => {
    const dto = plainToInstance(RegularizarEmpresaDto, {
      diasValidade: 30,
      motivo: '  Contrato regularizado  ',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.motivo).toBe('Contrato regularizado');
  });

  it('recusa campos desconhecidos', async () => {
    await expect(
      validar({
        diasValidade: 30,
        motivo: 'Contrato regularizado',
        validadeComercialFim: '2030-01-01',
      }),
    ).resolves.not.toHaveLength(0);
  });
});
