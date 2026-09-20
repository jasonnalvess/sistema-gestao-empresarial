import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MODULO_ATIVO_KEY } from '../common/decorators/modulo-ativo.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ModuloAtivoGuard } from '../common/guards/modulo-ativo.guard';
import { CrmResponsaveisController } from './crm-responsaveis.controller';

describe('CrmResponsaveisController', () => {
  it('declara GET /crm/responsaveis com segurança CRM oficial', () => {
    expect(Reflect.getMetadata(PATH_METADATA, CrmResponsaveisController)).toBe(
      'crm/responsaveis',
    );
    expect(
      Reflect.getMetadata(MODULO_ATIVO_KEY, CrmResponsaveisController),
    ).toBe('crm');
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CrmResponsaveisController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      EmpresaContextoGuard,
      ModuloAtivoGuard,
      PermissionsGuard,
    ]);

    const descriptor = Object.getOwnPropertyDescriptor(
      CrmResponsaveisController.prototype,
      'listar',
    ) as TypedPropertyDescriptor<() => void>;
    const listar = descriptor.value;
    if (!listar) throw new Error('Método listar não encontrado');
    expect(Reflect.getMetadata(METHOD_METADATA, listar)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(ROLES_KEY, listar)).toEqual([
      'SUPER_ADMIN',
      'ADMIN_EMPRESA',
      'USUARIO_EMPRESA',
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, listar)).toEqual([
      'crm.visualizar',
    ]);
  });

  it('obtém empresaId exclusivamente do contexto empresarial', () => {
    const service = { listarResponsaveis: jest.fn() };
    const controller = new CrmResponsaveisController(service as never);

    void controller.listar({ empresaId: 'empresa-a', origem: 'JWT' });

    expect(service.listarResponsaveis).toHaveBeenCalledWith('empresa-a');
  });
});
