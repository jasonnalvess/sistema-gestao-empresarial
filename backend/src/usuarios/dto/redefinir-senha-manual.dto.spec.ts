import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RedefinirSenhaManualDto } from './redefinir-senha-manual.dto';

describe('RedefinirSenhaManualDto', () => {
  const validar = (dados: object) =>
    validate(plainToInstance(RedefinirSenhaManualDto, dados), {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

  it('aceita versão zero', async () => {
    await expect(validar({ versaoAutorizacao: 0 })).resolves.toHaveLength(0);
  });

  it('aceita o limite máximo de int32', async () => {
    await expect(
      validar({ versaoAutorizacao: 2147483647 }),
    ).resolves.toHaveLength(0);
  });

  it('rejeita versão ausente', async () => {
    await expect(validar({})).resolves.not.toHaveLength(0);
  });

  it('rejeita versão nula', async () => {
    await expect(
      validar({ versaoAutorizacao: null }),
    ).resolves.not.toHaveLength(0);
  });

  it('rejeita versão em string sem conversão implícita', async () => {
    await expect(validar({ versaoAutorizacao: '3' })).resolves.not.toHaveLength(
      0,
    );
  });

  it('rejeita versão decimal', async () => {
    await expect(validar({ versaoAutorizacao: 1.5 })).resolves.not.toHaveLength(
      0,
    );
  });

  it('rejeita versão negativa', async () => {
    await expect(validar({ versaoAutorizacao: -1 })).resolves.not.toHaveLength(
      0,
    );
  });

  it('rejeita versão acima de int32', async () => {
    await expect(
      validar({ versaoAutorizacao: 2147483648 }),
    ).resolves.not.toHaveLength(0);
  });

  it('rejeita campo extra', async () => {
    await expect(
      validar({ versaoAutorizacao: 0, campoExtra: true }),
    ).resolves.not.toHaveLength(0);
  });
});
