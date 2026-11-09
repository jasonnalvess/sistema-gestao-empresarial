import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

function obterMetodoResumo(): DashboardController['resumo'] {
  const metodo: unknown = Object.getOwnPropertyDescriptor(
    DashboardController.prototype,
    'resumo',
  )?.value;

  if (typeof metodo !== 'function') {
    throw new Error('Método resumo não encontrado no DashboardController.');
  }

  return metodo as DashboardController['resumo'];
}

describe('DashboardController', () => {
  let controller: DashboardController;
  const dashboardServiceMock = { resumo: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
      ],
    })
      .overrideGuard(EmpresaContextoGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('declara os quatro guards na ordem oficial', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, DashboardController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it('exige dashboard.visualizar no resumo', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, obterMetodoResumo())).toEqual([
      'dashboard.visualizar',
    ]);
  });

  it('aceita os três papéis empresariais no resumo', () => {
    expect(Reflect.getMetadata(ROLES_KEY, obterMetodoResumo())).toEqual([
      'SUPER_ADMIN',
      'ADMIN_EMPRESA',
      'USUARIO_EMPRESA',
    ]);
  });

  it('encaminha o empresaId do contexto ao service', async () => {
    dashboardServiceMock.resumo.mockResolvedValue({});

    await controller.resumo({ empresaId: 'empresa-1', origem: 'JWT' });

    expect(dashboardServiceMock.resumo).toHaveBeenCalledWith('empresa-1');
  });
});
