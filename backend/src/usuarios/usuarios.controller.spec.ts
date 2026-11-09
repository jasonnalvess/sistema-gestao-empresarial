import {
  BadRequestException,
  ForbiddenException,
  ValidationPipe,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AtualizarPerfisUsuarioDto } from './dto/atualizar-perfis-usuario.dto';
import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

describe('UsuariosController', () => {
  let controller: UsuariosController;

  const usuariosServiceMock = {
    criar: jest.fn(),
    listar: jest.fn(),
    buscarPorId: jest.fn(),
    atualizar: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    buscarPorEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        {
          provide: UsuariosService,
          useValue: usuariosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });
});

describe('CE-3D — contrato dos endpoints de perfis', () => {
  const ator = {
    id: 'ator',
    email: 'ator@example.invalid',
    tipo: 'ADMIN_EMPRESA' as const,
    empresaId: 'empresa-a',
    versaoAutorizacao: 0,
    permissoes: ['usuarios.perfis.gerenciar'],
  };
  const service = { listarPerfis: jest.fn(), atualizarPerfis: jest.fn() };
  const controller = new UsuariosController(
    service as unknown as UsuariosService,
  );
  beforeEach(() => jest.clearAllMocks());
  it('GET encaminha alvo e ator ao service', async () => {
    service.listarPerfis.mockResolvedValue([]);
    await expect(controller.listarPerfis('alvo', ator)).resolves.toEqual([]);
    expect(service.listarPerfis).toHaveBeenCalledWith('alvo', ator);
  });
  it('PUT encaminha DTO vazio válido e ator ao service', async () => {
    service.atualizarPerfis.mockResolvedValue([]);
    await expect(
      controller.atualizarPerfis('alvo', { perfisIds: [] }, ator),
    ).resolves.toEqual([]);
    expect(service.atualizarPerfis).toHaveBeenCalledWith(
      'alvo',
      { perfisIds: [] },
      ator,
    );
  });
  it.each(['listarPerfis', 'atualizarPerfis'] as const)(
    '%s exige permissão no guard existente',
    (metodo) => {
      const reflector = new Reflector();
      expect(reflector.get(PERMISSIONS_KEY, controller[metodo])).toEqual([
        'usuarios.perfis.gerenciar',
      ]);
      const request = { user: { ...ator, permissoes: [] as string[] } };
      const context = {
        getHandler: () => controller[metodo],
        getClass: () => UsuariosController,
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext;
      const guard = new PermissionsGuard(reflector);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      request.user.permissoes = [...ator.permissoes];
      expect(guard.canActivate(context)).toBe(true);
      expect(reflector.get('roles', controller[metodo])).toEqual([
        'SUPER_ADMIN',
        'ADMIN_EMPRESA',
      ]);
    },
  );
  it('mantém os três guards no controller', () => {
    const guards: { name: string }[] = Reflect.getMetadata(
      '__guards__',
      UsuariosController,
    ) as { name: string }[];
    expect(guards.map((guard) => guard.name)).toEqual([
      'JwtAuthGuard',
      'RolesGuard',
      'PermissionsGuard',
    ]);
  });
  const uuid = 'b3f0846b-3f58-4e62-bd87-e01ad7ba114e';
  const validar = (value: unknown) =>
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }).transform(value, { type: 'body', metatype: AtualizarPerfisUsuarioDto });
  it.each([
    { caso: 'ausente', body: {} },
    { caso: 'nulo', body: { perfisIds: null } },
    { caso: 'não array', body: { perfisIds: uuid } },
    { caso: 'item não string', body: { perfisIds: [123] } },
    { caso: 'UUID inválido', body: { perfisIds: ['invalido'] } },
    { caso: 'duplicatas', body: { perfisIds: [uuid, uuid] } },
    { caso: 'campo extra', body: { perfisIds: [], empresaId: uuid } },
  ])('DTO rejeita $caso', async ({ body }) => {
    await expect(validar(body)).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([{ ids: [] }, { ids: [uuid] }])(
    'DTO aceita $ids',
    async ({ ids }) => {
      await expect(validar({ perfisIds: ids })).resolves.toEqual({
        perfisIds: ids,
      });
    },
  );
});
