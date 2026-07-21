import { OrdensServicoController } from './ordens-servico.controller';

describe('OrdensServicoController', () => {
  it('delega a criação ao service preservando usuário e DTO', async () => {
    const service = { criar: jest.fn().mockResolvedValue({ id: 'ordem-1' }) };
    const controller = new OrdensServicoController(service as any);
    const body = { titulo: 'Manutenção', clienteId: 'cliente-1' };
    const req = { user: { id: 'usuario-1', empresaId: 'empresa-1' } };

    await expect(controller.criar(body, req)).resolves.toEqual({
      id: 'ordem-1',
    });
    expect(service.criar).toHaveBeenCalledWith(body, req.user);
  });

  it('delega alteração de status ao service', async () => {
    const service = {
      alterarStatus: jest.fn().mockResolvedValue({
        id: 'ordem-1',
        status: 'CONCLUIDA',
      }),
    };
    const controller = new OrdensServicoController(service as any);
    const body = { status: 'CONCLUIDA' };
    const req = { user: { id: 'usuario-1', empresaId: 'empresa-1' } };

    await expect(
      controller.alterarStatus('ordem-1', body, req),
    ).resolves.toEqual({ id: 'ordem-1', status: 'CONCLUIDA' });
    expect(service.alterarStatus).toHaveBeenCalledWith(
      'ordem-1',
      body,
      req.user,
    );
  });
});
