import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MovimentarCrmOportunidadeDto } from './movimentar-crm-oportunidade.dto';

describe('MovimentarCrmOportunidadeDto', () => {
  const etapaId = '11111111-1111-4111-8111-111111111111';
  const validarDto = (dados: object) =>
    validate(plainToInstance(MovimentarCrmOportunidadeDto, dados));

  it('deve aceitar etapaId UUID e versaoRegistro zero', async () => {
    await expect(
      validarDto({ etapaId, versaoRegistro: 0 }),
    ).resolves.toHaveLength(0);
  });
  it('deve rejeitar etapaId que não seja UUID', async () => {
    expect(
      await validarDto({ etapaId: 'invalido', versaoRegistro: 0 }),
    ).not.toHaveLength(0);
  });
  it('deve rejeitar versaoRegistro negativo', async () => {
    expect(await validarDto({ etapaId, versaoRegistro: -1 })).not.toHaveLength(
      0,
    );
  });
  it('deve rejeitar versaoRegistro decimal', async () => {
    expect(await validarDto({ etapaId, versaoRegistro: 1.5 })).not.toHaveLength(
      0,
    );
  });
  it('deve normalizar motivoPerda removendo espaços externos', async () => {
    const dto = plainToInstance(MovimentarCrmOportunidadeDto, {
      etapaId,
      versaoRegistro: 0,
      motivoPerda: '  Sem orçamento  ',
    });
    expect(dto.motivoPerda).toBe('Sem orçamento');
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
  it('deve aceitar motivoPerda ausente', async () => {
    await expect(
      validarDto({ etapaId, versaoRegistro: 0 }),
    ).resolves.toHaveLength(0);
  });
  it('deve rejeitar campo extra pelo ValidationPipe global', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { etapaId, versaoRegistro: 0, clienteId: etapaId },
        { type: 'body', metatype: MovimentarCrmOportunidadeDto },
      ),
    ).rejects.toBeDefined();
  });
});
