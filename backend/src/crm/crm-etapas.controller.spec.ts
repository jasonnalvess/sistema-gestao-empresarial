import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MODULO_ATIVO_KEY } from '../common/decorators/modulo-ativo.decorator';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import { ModuloAtivoGuard } from '../common/guards/modulo-ativo.guard';
import { CrmEtapasController } from './crm-etapas.controller';

describe('CrmEtapasController', () => {
  const metodos = ['listar', 'buscarPorId', 'criar', 'atualizar'] as const;

  it('declara o módulo CRM e os guards na ordem oficial', () => {
    expect(Reflect.getMetadata(MODULO_ATIVO_KEY, CrmEtapasController)).toBe(
      'crm',
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, CrmEtapasController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
      EmpresaContextoGuard,
      ModuloAtivoGuard,
      PermissionsGuard,
    ]);
  });

  it.each([
    ['listar', 'crm.visualizar'],
    ['buscarPorId', 'crm.visualizar'],
    ['criar', 'crm.funil.gerenciar'],
    ['atualizar', 'crm.funil.gerenciar'],
  ] as const)('exige a permissão correta em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        CrmEtapasController.prototype[metodo],
      ),
    ).toEqual([permissao]);
  });

  it.each(metodos)('aceita os papéis permitidos em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, CrmEtapasController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });

  it('expõe somente GET, POST e PATCH; não expõe DELETE', () => {
    const verbos: RequestMethod[] = metodos.map(
      (metodo) =>
        Reflect.getMetadata(
          METHOD_METADATA,
          CrmEtapasController.prototype[metodo],
        ) as RequestMethod,
    );

    expect(verbos).toEqual([
      RequestMethod.GET,
      RequestMethod.GET,
      RequestMethod.POST,
      RequestMethod.PATCH,
    ]);
    expect(verbos).not.toContain(RequestMethod.DELETE);
  });
});
