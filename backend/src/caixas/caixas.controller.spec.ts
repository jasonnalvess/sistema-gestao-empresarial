import { TipoMovimentacaoCaixa } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { CaixasController } from './caixas.controller';
import { CaixasService } from './caixas.service';

const usuario: AuthenticatedUser = {
  id: 'u1',
  email: 'usuario@empresa.com',
  empresaId: 'e1',
  tipo: 'ADMIN_EMPRESA',
};

describe('CaixasController', () => {
  let controller: CaixasController;
  let service: Record<string, jest.Mock>;

  beforeEach(() => {
    service = {
      criar: jest.fn(),
      abrir: jest.fn(),
      fechar: jest.fn(),
      criarMovimentacao: jest.fn(),
      buscarPorId: jest.fn(),
      listar: jest.fn(),
      resumo: jest.fn(),
      listarMovimentacoes: jest.fn(),
      buscarAberturaAtiva: jest.fn(),
      listarAberturas: jest.fn(),
      atualizar: jest.fn(),
    };

    controller = new CaixasController(service as unknown as CaixasService);
  });

  it('encaminha cadastro com usuário autenticado', async () => {
    const dto = {
      nome: 'Principal',
      codigo: 'CX1',
    };

    await controller.criar(dto, usuario);

    expect(service.criar).toHaveBeenCalledWith(dto, usuario);
  });

  it('encaminha abertura e fechamento', async () => {
    await controller.abrir('c1', { saldoInicial: 10 }, usuario);

    await controller.fechar('c1', { saldoInformado: 10 }, usuario);

    expect(service.abrir).toHaveBeenCalledWith(
      'c1',
      { saldoInicial: 10 },
      usuario,
    );

    expect(service.fechar).toHaveBeenCalledWith(
      'c1',
      { saldoInformado: 10 },
      usuario,
    );
  });

  it('encaminha movimentação manual', async () => {
    const dto = {
      tipo: TipoMovimentacaoCaixa.ENTRADA,
      descricao: 'Entrada',
      valor: 10,
    };

    await controller.movimentar('c1', dto, usuario);

    expect(service.criarMovimentacao).toHaveBeenCalledWith('c1', dto, usuario);
  });
});
