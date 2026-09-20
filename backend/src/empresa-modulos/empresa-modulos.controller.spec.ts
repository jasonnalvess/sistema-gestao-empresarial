import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { PrismaService } from '../prisma/prisma.service';
import { EmpresaModulosController } from './empresa-modulos.controller';
import { EmpresaModulosService } from './empresa-modulos.service';

describe('EmpresaModulosController', () => {
  let controller: EmpresaModulosController;

  const empresaModulosServiceMock = {
    vincular: jest.fn(),
    listarPorEmpresa: jest.fn(),
    listarAtivosDaEmpresa: jest.fn(),
    ativar: jest.fn(),
    desativar: jest.fn(),
    buscarPorId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresaModulosController],
      providers: [
        { provide: PrismaService, useValue: {} },
        {
          provide: EmpresaModulosService,
          useValue: empresaModulosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<EmpresaModulosController>(EmpresaModulosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('expõe GET /empresa-modulos/me usando somente o contexto empresarial', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      EmpresaModulosController.prototype,
      'listarAtivosDaEmpresa',
    ) as TypedPropertyDescriptor<() => void>;
    const listarAtivosDaEmpresa = descriptor.value;
    if (!listarAtivosDaEmpresa)
      throw new Error('Método listarAtivosDaEmpresa não encontrado');

    expect(Reflect.getMetadata(PATH_METADATA, listarAtivosDaEmpresa)).toBe(
      'me',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, listarAtivosDaEmpresa)).toBe(
      RequestMethod.GET,
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, EmpresaModulosController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, listarAtivosDaEmpresa)).toEqual(
      [EmpresaContextoGuard],
    );
    expect(Reflect.getMetadata(ROLES_KEY, listarAtivosDaEmpresa)).toEqual([
      'SUPER_ADMIN',
      'ADMIN_EMPRESA',
      'USUARIO_EMPRESA',
    ]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, listarAtivosDaEmpresa),
    ).not.toContain(PermissionsGuard);
  });

  it('encaminha somente a empresa resolvida pelo contexto', () => {
    void controller.listarAtivosDaEmpresa({
      empresaId: 'empresa-a',
      origem: 'JWT',
    });

    expect(
      empresaModulosServiceMock.listarAtivosDaEmpresa,
    ).toHaveBeenCalledWith('empresa-a');
  });
});
