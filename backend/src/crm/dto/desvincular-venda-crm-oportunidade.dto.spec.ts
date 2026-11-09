import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DesvincularVendaCrmOportunidadeDto } from './desvincular-venda-crm-oportunidade.dto';

describe('DesvincularVendaCrmOportunidadeDto', () => {
  it('aceita versaoRegistro zero', async () => {
    const erros = await validate(
      plainToInstance(DesvincularVendaCrmOportunidadeDto, {
        versaoRegistro: 0,
      }),
    );
    expect(erros).toHaveLength(0);
  });

  it('rejeita versaoRegistro negativa', async () => {
    const erros = await validate(
      plainToInstance(DesvincularVendaCrmOportunidadeDto, {
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
        { versaoRegistro: 0, vendaId: 'não permitido' },
        { type: 'body', metatype: DesvincularVendaCrmOportunidadeDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
