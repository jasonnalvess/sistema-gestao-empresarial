import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmpresaContextoGuard } from '../common/guards/empresa-contexto.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { OrdensServicoController } from './ordens-servico.controller';
import type { OrdensServicoService } from './ordens-servico.service';

describe('OrdensServicoController', () => {
  const usuario: AuthenticatedUser = {
    id: 'usuario-1',
    email: 'usuario@empresa.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'empresa-1',
  };

  it('delega a criação ao service preservando usuário e DTO', async () => {
    const service = {
      criar: jest.fn().mockResolvedValue({
        id: 'ordem-1',
      }),
    };

    const controller = new OrdensServicoController(
      service as unknown as OrdensServicoService,
    );

    const body = {
      titulo: 'Manutenção',
      clienteId: 'cliente-1',
    };

    await expect(
      controller.criar(
        { empresaId: 'empresa-1', origem: 'JWT' },
        body,
        usuario,
      ),
    ).resolves.toEqual({
      id: 'ordem-1',
    });

    expect(service.criar).toHaveBeenCalledWith('empresa-1', 'usuario-1', body);
  });

  it('delega alteração de status ao service', async () => {
    const service = {
      alterarStatus: jest.fn().mockResolvedValue({
        id: 'ordem-1',
        status: 'CONCLUIDA',
      }),
    };

    const controller = new OrdensServicoController(
      service as unknown as OrdensServicoService,
    );

    const body = {
      status: 'CONCLUIDA',
    };

    await expect(
      controller.alterarStatus(
        { empresaId: 'empresa-1', origem: 'JWT' },
        'ordem-1',
        body,
        usuario,
      ),
    ).resolves.toEqual({
      id: 'ordem-1',
      status: 'CONCLUIDA',
    });

    expect(service.alterarStatus).toHaveBeenCalledWith(
      'empresa-1',
      'ordem-1',
      'usuario-1',
      body,
    );
  });
  it('encaminha empresa, IDs, filtros, DTO e autoria nos demais endpoints', async () => {
    const service = {
      listar: jest.fn().mockResolvedValue([]),
      buscarPorId: jest.fn().mockResolvedValue({ id: 'ordem-1' }),
      listarHistorico: jest.fn().mockResolvedValue([]),
      adicionarHistorico: jest.fn().mockResolvedValue({ id: 'historico-1' }),
    };
    const controller = new OrdensServicoController(
      service as unknown as OrdensServicoService,
    );
    const empresa = { empresaId: 'empresa-1', origem: 'JWT' as const };
    const filtros = { page: 2, limit: 20, clienteId: 'cliente-1' };
    const historico = { descricao: 'Diagnóstico' };

    await controller.listar(empresa, filtros);
    await controller.buscarPorId(empresa, 'ordem-1');
    await controller.listarHistorico(empresa, 'ordem-1');
    await controller.adicionarHistorico(empresa, 'ordem-1', historico, usuario);

    expect(service.listar).toHaveBeenCalledWith('empresa-1', filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith('empresa-1', 'ordem-1');
    expect(service.listarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'ordem-1',
    );
    expect(service.adicionarHistorico).toHaveBeenCalledWith(
      'empresa-1',
      'ordem-1',
      'usuario-1',
      historico,
    );
  });

  it('declara os quatro guards na ordem oficial', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, OrdensServicoController),
    ).toEqual([
      JwtAuthGuard,
      RolesGuard,
      PermissionsGuard,
      EmpresaContextoGuard,
    ]);
  });

  it.each([
    ['criar', 'ordens_servico.criar'],
    ['listar', 'ordens_servico.visualizar'],
    ['buscarPorId', 'ordens_servico.visualizar'],
    ['listarHistorico', 'ordens_servico.visualizar'],
    ['adicionarHistorico', 'ordens_servico.historico.adicionar'],
    ['alterarStatus', 'ordens_servico.status.alterar'],
  ] as const)('exige a permissão oficial em %s', (metodo, permissao) => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        OrdensServicoController.prototype[metodo],
      ),
    ).toEqual([permissao]);
  });

  it.each([
    'criar',
    'listar',
    'buscarPorId',
    'listarHistorico',
    'adicionarHistorico',
    'alterarStatus',
  ] as const)('aceita os três papéis em %s', (metodo) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, OrdensServicoController.prototype[metodo]),
    ).toEqual(['SUPER_ADMIN', 'ADMIN_EMPRESA', 'USUARIO_EMPRESA']);
  });
});
