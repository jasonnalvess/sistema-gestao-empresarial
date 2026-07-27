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

    await expect(controller.criar(body, usuario)).resolves.toEqual({
      id: 'ordem-1',
    });

    expect(service.criar).toHaveBeenCalledWith(body, usuario);
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
      controller.alterarStatus('ordem-1', body, usuario),
    ).resolves.toEqual({
      id: 'ordem-1',
      status: 'CONCLUIDA',
    });

    expect(service.alterarStatus).toHaveBeenCalledWith(
      'ordem-1',
      body,
      usuario,
    );
  });
});
