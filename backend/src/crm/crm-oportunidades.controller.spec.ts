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
import { CrmOportunidadesController } from './crm-oportunidades.controller';

describe('CrmOportunidadesController', () => {
  const metodos = [
    'criar',
    'listar',
    'buscarPorId',
    'movimentar',
    'reabrir',
    'desvincularVenda',
    'vincularVenda',
    'atualizar',
  ] as const;

  it('declara o módulo CRM e os guards na ordem oficial', () => {
    expect(
      Reflect.getMetadata(MODULO_ATIVO_KEY, CrmOportunidadesController),
    ).toBe('crm');
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CrmOportunidadesController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      EmpresaContextoGuard,
      ModuloAtivoGuard,
      PermissionsGuard,
    ]);
  });

  it.each([
    ['criar', 'crm.oportunidades.criar'],
    ['listar', 'crm.visualizar'],
    ['buscarPorId', 'crm.visualizar'],
    ['movimentar', 'crm.oportunidades.movimentar'],
    ['reabrir', 'crm.oportunidades.movimentar'],
    ['desvincularVenda', 'crm.oportunidades.editar'],
    ['vincularVenda', ['crm.oportunidades.editar', 'vendas.visualizar']],
    ['atualizar', 'crm.oportunidades.editar'],
  ] as const)('exige a permissão correta em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        CrmOportunidadesController.prototype[metodo],
      ),
    ).toEqual(Array.isArray(permissao) ? permissao : [permissao]);
  });

  it.each(metodos)('aceita os papéis permitidos em %s', (metodo) => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        CrmOportunidadesController.prototype[metodo],
      ),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });

  it('expõe PATCH /:id/venda/desvincular para a desvinculação explícita', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CrmOportunidadesController.prototype,
      'desvincularVenda',
    ) as TypedPropertyDescriptor<() => void>;
    const desvincularVenda = descriptor.value;
    if (!desvincularVenda)
      throw new Error('Método desvincularVenda não encontrado');
    expect(Reflect.getMetadata(PATH_METADATA, desvincularVenda)).toBe(
      ':id/venda/desvincular',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, desvincularVenda)).toBe(
      RequestMethod.PATCH,
    );
  });

  it('expõe PATCH /:id/venda para o vínculo explícito', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      CrmOportunidadesController.prototype,
      'vincularVenda',
    ) as TypedPropertyDescriptor<() => void>;
    const vincularVenda = descriptor.value;
    if (!vincularVenda) throw new Error('Método vincularVenda não encontrado');
    expect(Reflect.getMetadata(PATH_METADATA, vincularVenda)).toBe(':id/venda');
    expect(Reflect.getMetadata(METHOD_METADATA, vincularVenda)).toBe(
      RequestMethod.PATCH,
    );
  });

  it('expõe somente os métodos da fase', () => {
    const verbos: RequestMethod[] = metodos.map(
      (metodo) =>
        Reflect.getMetadata(
          METHOD_METADATA,
          CrmOportunidadesController.prototype[metodo],
        ) as RequestMethod,
    );

    expect(verbos).toEqual([
      RequestMethod.POST,
      RequestMethod.GET,
      RequestMethod.GET,
      RequestMethod.PATCH,
      RequestMethod.PATCH,
      RequestMethod.PATCH,
      RequestMethod.PATCH,
      RequestMethod.PATCH,
    ]);
  });
});
