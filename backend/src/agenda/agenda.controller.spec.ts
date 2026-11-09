import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { CriarAgendaEventoDto } from './dto/criar-agenda-evento.dto';
import { AtualizarAgendaEventoDto } from './dto/atualizar-agenda-evento.dto';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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
    })
      .overrideGuard(EmpresaContextoGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

    expect(tiposCriar[1]).toBe(CriarAgendaEventoDto);
    expect(tiposAtualizar[2]).toBe(AtualizarAgendaEventoDto);
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

  it('declara os quatro guards na ordem oficial', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AgendaController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'agenda.criar'],
    ['listar', 'agenda.visualizar'],
    ['buscarPorId', 'agenda.visualizar'],
    ['listarHistorico', 'agenda.visualizar'],
    ['adicionarHistorico', 'agenda.editar'],
    ['atualizar', 'agenda.editar'],
    ['cancelar', 'agenda.cancelar'],
  ] as const)('exige a permissão oficial em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, AgendaController.prototype[metodo]),
    ).toEqual([permissao]);
  });

  it.each([
    'criar',
    'listar',
    'buscarPorId',
    'listarHistorico',
    'adicionarHistorico',
    'atualizar',
    'cancelar',
  ] as const)('aceita os três papéis em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AgendaController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });

  it('encaminha empresaId, IDs, DTOs e autoria às APIs públicas', async () => {
    const service = {
      criar: jest.fn(),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      atualizar: jest.fn(),
      cancelar: jest.fn(),
      adicionarHistorico: jest.fn(),
      listarHistorico: jest.fn(),
    };
    const controllerComMock = new AgendaController(
      service as unknown as AgendaService,
    );
    const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
    const usuario = {
      id: 'usuario-1',
      email: 'usuario@empresa.com',
      tipo: 'USUARIO_EMPRESA',
      empresaId: 'empresa-1',
    };
    const criar = {
      titulo: 'Visita',
      dataInicio: '2026-08-03T09:00:00.000Z',
      dataFim: '2026-08-03T10:00:00.000Z',
    };
    const atualizar = { status: 'EM_ANDAMENTO' as const };
    const historico = { descricao: 'Contato realizado' };

    await controllerComMock.criar(empresa, criar, usuario);
    await controllerComMock.listar(empresa);
    await controllerComMock.buscarPorId(empresa, 'evento-1');
    await controllerComMock.atualizar(empresa, 'evento-1', atualizar, usuario);
    await controllerComMock.cancelar(empresa, 'evento-1', usuario);
    await controllerComMock.adicionarHistorico(
      empresa,
      'evento-1',
      historico,
      usuario,
    );
    await controllerComMock.listarHistorico(empresa, 'evento-1');

    expect(service.criar).toHaveBeenCalledWith('empresa-1', 'usuario-1', criar);
    expect(service.listar).toHaveBeenCalledWith('empresa-1');
    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 'evento-1');
    expect(service.atualizar).toHaveBeenCalledWith(
      'empresa-1',
      'evento-1',
      'usuario-1',
      atualizar,
    );
    expect(service.cancelar).toHaveBeenCalledWith(
      'empresa-1',
      'evento-1',
      'usuario-1',
    );
    expect(service.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'evento-1',
      'usuario-1',
      historico,
    );
    expect(service.listarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'evento-1',
    );
  });
});
