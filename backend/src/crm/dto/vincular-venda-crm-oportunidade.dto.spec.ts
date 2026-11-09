import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VincularVendaCrmOportunidadeDto } from './vincular-venda-crm-oportunidade.dto';

describe('VincularVendaCrmOportunidadeDto', () => {
  const valido = {
    vendaId: '55555555-5555-4555-8555-555555555555',
    versaoRegistro: 0,
  };

  it('aceita vendaId UUID e versaoRegistro zero', async () => {
    const erros = await validate(
      plainToInstance(VincularVendaCrmOportunidadeDto, valido),
    );
    expect(erros).toHaveLength(0);
  });

  it('rejeita vendaId que não seja UUID', async () => {
    const erros = await validate(
      plainToInstance(VincularVendaCrmOportunidadeDto, {
        ...valido,
        vendaId: 'invalido',
      }),
    );
    expect(erros).not.toHaveLength(0);
  });

  it('rejeita versaoRegistro negativa', async () => {
    const erros = await validate(
      plainToInstance(VincularVendaCrmOportunidadeDto, {
        ...valido,
        versaoRegistro: -1,
      }),
    );
    expect(erros).not.toHaveLength(0);
  });

  it('rejeita campo extra pelo ValidationPipe global', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { ...valido, clienteId: '11111111-1111-4111-8111-111111111111' },
        { type: 'body', metatype: VincularVendaCrmOportunidadeDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
