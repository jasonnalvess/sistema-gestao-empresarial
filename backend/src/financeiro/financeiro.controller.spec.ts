import { GUARDS_METADATA } from '@nestjs/common/constants';

import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';

import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';

const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
const resumoHandler = Object.getOwnPropertyDescriptor(
  FinanceiroController.prototype,
  'resumo',
)?.value as unknown as object;

describe('FinanceiroController', () => {
  let controller: FinanceiroController;
  let service: { resumo: jest.Mock };

  beforeEach(() => {
    service = { resumo: jest.fn() };
    controller = new FinanceiroController(
      service as unknown as FinanceiroService,
    );
  });

  it('deve estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('declara os guards na ordem JWT, papéis, permissões e empresa', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, FinanceiroController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it('aceita os três papéis operacionais no resumo', () => {
    expect(Reflect.getMetadata(ROLES_KEY, resumoHandler)).toEqual([
      'SUPER_ADMIN',
      'ADMIN_EMPRESA',
      'USUARIO_EMPRESA',
    ]);
  });

  it('exige financeiro.visualizar no resumo', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, resumoHandler)).toEqual([
      'financeiro.visualizar',
    ]);
  });

  it('encaminha empresaId e filtros preservados ao service', async () => {
    const filtros = {
      vencimentoInicio: '2026-08-01',
      vencimentoFim: '2026-08-31',
    };
    service.resumo.mockResolvedValue({});

    await controller.resumo(empresa, filtros);

    expect(service.resumo).toHaveBeenCalledWith('empresa-1', filtros);
  });
});
