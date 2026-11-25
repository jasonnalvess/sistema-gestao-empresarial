import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { FiltroAuditoriaDto } from './dto/filtro-auditoria.dto';
import { FiltroAuditoriaGlobalDto } from './dto/filtro-auditoria-global.dto';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };

function obterMetodo(
  nome: 'listarEmpresa' | 'listarGlobal',
): (...args: never[]) => unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    AuditoriaController.prototype,
    nome,
  );

  if (typeof descriptor?.value !== 'function') {
    throw new Error('Metodo de controller nao encontrado');
  }

  return descriptor.value as (...args: never[]) => unknown;
}

describe('AuditoriaController', () => {
  let controller: AuditoriaController;
  let service: { listarEmpresa: jest.Mock; listarGlobal: jest.Mock };

  beforeEach(() => {
    service = { listarEmpresa: jest.fn(), listarGlobal: jest.fn() };
    controller = new AuditoriaController(
      service as unknown as AuditoriaService,
    );
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('encaminha empresaId contextual e filtros ao fluxo empresarial', async () => {
    const filtros: FiltroAuditoriaDto = { search: 'produto', page: 2 };
    await controller.listarEmpresa(empresa, filtros);
    expect(service.listarEmpresa).toHaveBeenCalledWith('empresa-1', filtros);
  });

  it('encaminha filtros e empresa opcional ao fluxo global', async () => {
    const filtros: FiltroAuditoriaGlobalDto = { empresaId: 'empresa-1' };
    await controller.listarGlobal(filtros);
    expect(service.listarGlobal).toHaveBeenCalledWith(filtros);
  });

  it('declara os quatro guards empresariais na ordem oficial', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, obterMetodo('listarEmpresa')),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it('declara somente os três guards administrativos na ordem oficial', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      obterMetodo('listarGlobal'),
    ) as unknown;
    expect(guards).toEqual([JwtAuthGuard, RolesGuard, PermissionsGuard]);
    expect(guards).not.toContain(EmpresaContextoGuard);
  });

  it('protege o endpoint empresarial com permissão e três roles', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, obterMetodo('listarEmpresa')),
    ).toEqual(['auditoria.empresa.visualizar']);
    expect(
      Reflect.getMetadata(ROLES_KEY, obterMetodo('listarEmpresa')),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });

  it('protege o endpoint global com permissão e roles administrativas', () => {
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, obterMetodo('listarGlobal')),
    ).toEqual(['sistema.auditoria.visualizar']);
    expect(Reflect.getMetadata(ROLES_KEY, obterMetodo('listarGlobal'))).toEqual(
      ['SUPER_ADMIN', 'ADMIN_EMPRESA'],
    );
  });

  it('expõe somente a nova rota global adicional', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, obterMetodo('listarGlobal')),
    ).toBe('global');
    expect(
      Reflect.getMetadata(PATH_METADATA, obterMetodo('listarEmpresa')),
    ).toBe('/');
  });
});
