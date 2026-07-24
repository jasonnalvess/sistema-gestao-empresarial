import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { CriarAgendaEventoDto } from './dto/criar-agenda-evento.dto';
import { AtualizarAgendaEventoDto } from './dto/atualizar-agenda-evento.dto';

describe('AgendaController', () => {
  let controller: AgendaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgendaController],
      providers: [
        {
          provide: AgendaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<AgendaController>(AgendaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('mantém DTO de criação no POST e usa DTO específico no PATCH', () => {
    const tiposCriar = Reflect.getMetadata(
      'design:paramtypes',
      AgendaController.prototype,
      'criar',
    ) as unknown[];
    const tiposAtualizar = Reflect.getMetadata(
      'design:paramtypes',
      AgendaController.prototype,
      'atualizar',
    ) as unknown[];

    expect(tiposCriar[0]).toBe(CriarAgendaEventoDto);
    expect(tiposAtualizar[1]).toBe(AtualizarAgendaEventoDto);
  });

  it.each([
    ['criação', CriarAgendaEventoDto],
    ['atualização', AtualizarAgendaEventoDto],
  ])('rejeita status fora do contrato de %s', async (_fluxo, metatype) => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const entrada =
      metatype === CriarAgendaEventoDto
        ? {
            titulo: 'Visita',
            dataInicio: '2026-07-23T09:00:00.000Z',
            dataFim: '2026-07-23T10:00:00.000Z',
            status: 'CONCLUIDO',
          }
        : { titulo: 'Visita', status: 'CANCELADO' };

    await expect(
      pipe.transform(entrada, { type: 'body', metatype }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('distingue clienteId omitido de remoção explícita no DTO de atualização', async () => {
    const pipe = new ValidationPipe({ transform: true });
    const omitido = (await pipe.transform(
      { titulo: 'Visita' },
      { type: 'body', metatype: AtualizarAgendaEventoDto },
    )) as AtualizarAgendaEventoDto;
    const removido = (await pipe.transform(
      { clienteId: null },
      { type: 'body', metatype: AtualizarAgendaEventoDto },
    )) as AtualizarAgendaEventoDto;

    expect(omitido.clienteId).toBeUndefined();
    expect(removido).toHaveProperty('clienteId', null);
  });
});
