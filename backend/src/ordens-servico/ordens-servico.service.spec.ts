import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdensServicoService } from './ordens-servico.service';

const usuario = {
  id: 'usuario-1',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};
const cliente = { id: 'cliente-1', empresaId: 'empresa-1', ativo: true };
const ordem = {
  id: 'ordem-1',
  numero: 1,
  titulo: 'Manutenção',
  status: 'ABERTA',
  empresaId: 'empresa-1',
  clienteId: 'cliente-1',
};

function erroP2002(target: string | string[]) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

function criarContexto() {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    cliente: { findUnique: jest.fn().mockResolvedValue(cliente) },
    usuario: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'responsavel-1',
        empresaId: 'empresa-1',
        ativo: true,
      }),
    },
    agendaEvento: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'agenda-1',
        empresaId: 'empresa-1',
        clienteId: 'cliente-1',
        ativo: true,
      }),
    },
    ordemServico: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(ordem),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        ...ordem,
        status: 'EM_ANDAMENTO',
      }),
      create: jest.fn().mockResolvedValue(ordem),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ordemServicoHistorico: {
      create: jest.fn().mockResolvedValue({ id: 'historico-1' }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    ordemServico: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ordemServicoHistorico: { findMany: jest.fn() },
  };
  return {
    tx,
    prisma,
    service: new OrdensServicoService(prisma as any),
  };
}

describe('OrdensServicoService', () => {
  describe('criar', () => {
    const dto = {
      titulo: 'Manutenção',
      clienteId: 'cliente-1',
      responsavelId: 'responsavel-1',
      agendaEventoId: 'agenda-1',
    };

    it('executa validações, numeração, criação e histórico no mesmo tx', async () => {
      const { service, prisma, tx } = criarContexto();

      await expect(service.criar(dto, usuario)).resolves.toEqual(ordem);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.cliente.findUnique).toHaveBeenCalledWith({
        where: { id: 'cliente-1' },
      });
      expect(tx.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: 'responsavel-1' },
      });
      expect(tx.agendaEvento.findUnique).toHaveBeenCalledWith({
        where: { id: 'agenda-1' },
      });
      expect(tx.ordemServico.create).toHaveBeenCalledTimes(1);
      expect(tx.ordemServicoHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ordemServicoId: 'ordem-1',
            usuarioId: 'usuario-1',
            statusNovo: 'ABERTA',
          }),
        }),
      );
    });

    it('adquire advisory lock de numeração antes de buscar o último número', async () => {
      const { service, tx } = criarContexto();
      await service.criar(dto, usuario);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.ordemServico.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.ordemServico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'empresa-1' } }),
      );
    });

    it('rejeita cliente de outra empresa antes de criar', async () => {
      const { service, tx } = criarContexto();
      tx.cliente.findUnique.mockResolvedValue({
        ...cliente,
        empresaId: 'empresa-2',
      });
      await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(tx.ordemServico.create).not.toHaveBeenCalled();
    });

    it('rejeita responsável de outra empresa', async () => {
      const { service, tx } = criarContexto();
      tx.usuario.findUnique.mockResolvedValue({
        id: 'responsavel-1',
        empresaId: 'empresa-2',
        ativo: true,
      });
      await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('rejeita agenda de outra empresa', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.findUnique.mockResolvedValue({
        id: 'agenda-1',
        empresaId: 'empresa-2',
        clienteId: 'cliente-1',
        ativo: true,
      });
      await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('propaga falha do histórico para rollback da transação', async () => {
      const { service, tx } = criarContexto();
      const falha = new Error('falha no histórico');
      tx.ordemServicoHistorico.create.mockRejectedValue(falha);
      await expect(service.criar(dto, usuario)).rejects.toBe(falha);
    });

    it.each([[['empresaId', 'numero']], ['OrdemServico_empresaId_numero_key']])(
      'converte P2002 conhecido com target %p',
      async (target) => {
        const { service, tx } = criarContexto();
        tx.ordemServico.create.mockRejectedValue(erroP2002(target as any));
        await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
          ConflictException,
        );
      },
    );

    it('propaga o mesmo P2002 desconhecido', async () => {
      const { service, tx } = criarContexto();
      const erro = erroP2002('AlgumaConstraint_desconhecida_key');
      tx.ordemServico.create.mockRejectedValue(erro);
      await expect(service.criar(dto, usuario)).rejects.toBe(erro);
    });
  });

  describe('alterarStatus', () => {
    it('bloqueia antes da releitura e usa updateMany condicional', async () => {
      const { service, prisma, tx } = criarContexto();
      await service.alterarStatus(
        'ordem-1',
        { status: 'EM_ANDAMENTO' },
        usuario,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.ordemServico.findUnique.mock.invocationCallOrder[0],
      );
      expect(tx.ordemServico.updateMany).toHaveBeenCalledWith({
        where: { id: 'ordem-1', empresaId: 'empresa-1', status: 'ABERTA' },
        data: { status: 'EM_ANDAMENTO', dataConclusao: undefined },
      });
    });

    it('conclui e registra histórico dentro do mesmo tx', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findUnique.mockResolvedValue({
        ...ordem,
        status: 'EM_ANDAMENTO',
      });
      await service.alterarStatus('ordem-1', { status: 'CONCLUIDA' }, usuario);
      expect(tx.ordemServico.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'EM_ANDAMENTO' }),
          data: expect.objectContaining({
            status: 'CONCLUIDA',
            dataConclusao: expect.any(Date),
          }),
        }),
      );
      expect(tx.ordemServicoHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            statusAnterior: 'EM_ANDAMENTO',
            statusNovo: 'CONCLUIDA',
          }),
        }),
      );
    });

    it.each([
      ['CONCLUIDA', 'CANCELADA'],
      ['CANCELADA', 'EM_ANDAMENTO'],
      ['EM_ANDAMENTO', 'ABERTA'],
      ['ABERTA', 'ABERTA'],
    ])('rejeita transição %s -> %s sem efeitos', async (anterior, novo) => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findUnique.mockResolvedValue({
        ...ordem,
        status: anterior,
      });
      await expect(
        service.alterarStatus('ordem-1', { status: novo }, usuario),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
      expect(tx.ordemServicoHistorico.create).not.toHaveBeenCalled();
    });

    it('não cria histórico quando a atualização condicional perde a corrida', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.alterarStatus('ordem-1', { status: 'EM_ANDAMENTO' }, usuario),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.ordemServicoHistorico.create).not.toHaveBeenCalled();
    });

    it('simula segunda conclusão vendo o estado já concluído', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findUnique.mockResolvedValue({
        ...ordem,
        status: 'CONCLUIDA',
      });
      await expect(
        service.alterarStatus('ordem-1', { status: 'CONCLUIDA' }, usuario),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
    });

    it('rejeita ordem de outra empresa após lock', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findUnique.mockResolvedValue({
        ...ordem,
        empresaId: 'empresa-2',
      });
      await expect(
        service.alterarStatus('ordem-1', { status: 'EM_ANDAMENTO' }, usuario),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('propaga falha do histórico e não executa a releitura final', async () => {
      const { service, tx } = criarContexto();
      const falha = new Error('falha no histórico');
      tx.ordemServicoHistorico.create.mockRejectedValue(falha);
      await expect(
        service.alterarStatus('ordem-1', { status: 'EM_ANDAMENTO' }, usuario),
      ).rejects.toBe(falha);
      expect(tx.ordemServico.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('adicionarHistorico', () => {
    it('usa transação, lock antes da releitura e o mesmo tx', async () => {
      const { service, prisma, tx } = criarContexto();
      await service.adicionarHistorico(
        'ordem-1',
        { descricao: 'Diagnóstico registrado' },
        usuario,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.ordemServico.findUnique.mock.invocationCallOrder[0],
      );
      expect(tx.ordemServicoHistorico.create).toHaveBeenCalledTimes(1);
    });

    it('não grava histórico para tenant incorreto', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findUnique.mockResolvedValue({
        ...ordem,
        empresaId: 'empresa-2',
      });
      await expect(
        service.adicionarHistorico(
          'ordem-1',
          { descricao: 'Tentativa' },
          usuario,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.ordemServicoHistorico.create).not.toHaveBeenCalled();
    });
  });
});

// Estes testes unitários usam mocks e não comprovam locks, concorrência,
// rollback físico ou deadlocks reais no PostgreSQL.
