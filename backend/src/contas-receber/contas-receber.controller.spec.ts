import { FormaRecebimento } from '@prisma/client';
import { ContasReceberController } from './contas-receber.controller';
import { ContasReceberService } from './contas-receber.service';

const usuario = {
  id: 'usuario-1',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};

describe('ContasReceberController', () => {
  let controller: ContasReceberController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      criar: jest.fn(),
      atualizar: jest.fn(),
      registrarRecebimento: jest.fn(),
      cancelar: jest.fn(),
      gerarAPartirOrdemServico: jest.fn(),
      listar: jest.fn(),
      buscarPorId: jest.fn(),
      adicionarHistorico: jest.fn(),
      listarHistorico: jest.fn(),
    };
    controller = new ContasReceberController(
      service as unknown as ContasReceberService,
    );
  });

  it('encaminha criação e atualização com usuário autenticado', async () => {
    const criacao = {
      descricao: 'Conta',
      dataVencimento: '2026-08-10',
      valorOriginal: 100,
    };
    const atualizacao = { observacao: 'Atualizada' };
    await controller.criar(criacao, { user: usuario });
    await controller.atualizar('conta-1', atualizacao, { user: usuario });
    expect(service.criar).toHaveBeenCalledWith(criacao, usuario);
    expect(service.atualizar).toHaveBeenCalledWith(
      'conta-1',
      atualizacao,
      usuario,
    );
  });

  it('encaminha recebimento e cancelamento preservando contratos', async () => {
    const recebimento = { valor: 100, formaRecebimento: FormaRecebimento.PIX };
    await controller.registrarRecebimento('conta-1', recebimento, {
      user: usuario,
    });
    await controller.cancelar('conta-1', { user: usuario });
    expect(service.registrarRecebimento).toHaveBeenCalledWith(
      'conta-1',
      recebimento,
      usuario,
    );
    expect(service.cancelar).toHaveBeenCalledWith('conta-1', usuario);
  });

  it('encaminha geração por ordem de serviço', async () => {
    const dto = { dataVencimento: '2026-08-10', valorOriginal: 100 };
    await controller.gerarAPartirOrdemServico('ordem-1', dto, {
      user: usuario,
    });
    expect(service.gerarAPartirOrdemServico).toHaveBeenCalledWith(
      'ordem-1',
      dto,
      usuario,
    );
  });

  it('encaminha consultas e histórico com o tenant do usuário', async () => {
    const filtros = { page: 1 };
    const historico = { descricao: 'Observação' };
    await controller.listar(filtros, { user: usuario });
    await controller.buscarPorId('conta-1', { user: usuario });
    await controller.adicionarHistorico('conta-1', historico, {
      user: usuario,
    });
    await controller.listarHistorico('conta-1', { user: usuario });
    expect(service.listar).toHaveBeenCalledWith(usuario, filtros);
    expect(service.buscarPorId).toHaveBeenCalledWith('conta-1', usuario);
    expect(service.adicionarHistorico).toHaveBeenCalledWith(
      'conta-1',
      historico,
      usuario,
    );
    expect(service.listarHistorico).toHaveBeenCalledWith('conta-1', usuario);
  });
});
