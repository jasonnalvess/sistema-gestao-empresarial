import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdensServicoService } from './ordens-servico.service';

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
    $executeRaw: jest.fn().mockResolvedValue(1),
    $queryRaw: jest.fn().mockResolvedValue([]),
    cliente: { findFirst: jest.fn().mockResolvedValue(cliente) },
    usuario: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'responsavel-1',
        empresaId: 'empresa-1',
        ativo: true,
      }),
    },
    agendaEvento: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'agenda-1',
        empresaId: 'empresa-1',
        clienteId: 'cliente-1',
        ativo: true,
      }),
    },
    ordemServico: {
      findFirst: jest.fn().mockResolvedValue(ordem),
      findFirstOrThrow: jest.fn().mockResolvedValue({
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
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
    ),
    ordemServico: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ordemServicoHistorico: { findMany: jest.fn() },
  };
  return {
    tx,
    prisma,
    service: new OrdensServicoService(prisma as never),
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

      await expect(
        service.criar('empresa-1', 'usuario-1', dto),
      ).resolves.toEqual(ordem);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.cliente.findFirst).toHaveBeenCalledWith({
        where: { id: 'cliente-1', empresaId: 'empresa-1' },
      });
      expect(tx.usuario.findFirst).toHaveBeenCalledWith({
        where: { id: 'responsavel-1', empresaId: 'empresa-1' },
      });
      expect(tx.agendaEvento.findFirst).toHaveBeenCalledWith({
        where: { id: 'agenda-1', empresaId: 'empresa-1' },
      });
      expect(tx.ordemServico.create).toHaveBeenCalledTimes(1);
      const chamadaHistorico = (
        tx.ordemServicoHistorico.create.mock.calls as Array<
          [Prisma.OrdemServicoHistoricoCreateArgs]
        >
      )[0][0];
      expect(chamadaHistorico.data).toMatchObject({
        ordemServicoId: 'ordem-1',
        usuarioId: 'usuario-1',
        statusNovo: 'ABERTA',
      });
    });

    it('adquire advisory lock de numeração antes de buscar o último número', async () => {
      const { service, tx } = criarContexto();
      await service.criar('empresa-1', 'usuario-1', dto);
      expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.ordemServico.findFirst.mock.invocationCallOrder[0],
      );
      const chamadaExecuteRaw = tx.$executeRaw.mock.calls[0] as [
        TemplateStringsArray,
        string,
      ];

      expect(chamadaExecuteRaw[0]).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pg_advisory_xact_lock'),
        ]),
      );

      expect(chamadaExecuteRaw[1]).toBe('ordem-servico-numero:empresa-1');
      expect(tx.$queryRaw).not.toHaveBeenCalled();
      expect(tx.ordemServico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'empresa-1' } }),
      );
    });

    it('rejeita cliente de outra empresa antes de criar', async () => {
      const { service, tx } = criarContexto();
      tx.cliente.findFirst.mockResolvedValue(null);
      await expect(
        service.criar('empresa-1', 'usuario-1', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.ordemServico.create).not.toHaveBeenCalled();
    });

    it('rejeita responsável de outra empresa', async () => {
      const { service, tx } = criarContexto();
      tx.usuario.findFirst.mockResolvedValue(null);
      await expect(
        service.criar('empresa-1', 'usuario-1', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejeita agenda de outra empresa', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.findFirst.mockResolvedValue(null);
      await expect(
        service.criar('empresa-1', 'usuario-1', dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propaga falha do histórico para rollback da transação', async () => {
      const { service, tx } = criarContexto();
      const falha = new Error('falha no histórico');
      tx.ordemServicoHistorico.create.mockRejectedValue(falha);
      await expect(service.criar('empresa-1', 'usuario-1', dto)).rejects.toBe(
        falha,
      );
    });

    it.each([[['empresaId', 'numero']], ['OrdemServico_empresaId_numero_key']])(
      'converte P2002 conhecido com target %p',
      async (target) => {
        const { service, tx } = criarContexto();
        tx.ordemServico.create.mockRejectedValue(erroP2002(target));
        await expect(
          service.criar('empresa-1', 'usuario-1', dto),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );

    it('propaga o mesmo P2002 desconhecido', async () => {
      const { service, tx } = criarContexto();
      const erro = erroP2002('AlgumaConstraint_desconhecida_key');
      tx.ordemServico.create.mockRejectedValue(erro);
      await expect(service.criar('empresa-1', 'usuario-1', dto)).rejects.toBe(
        erro,
      );
    });
  });

  describe('alterarStatus', () => {
    it('bloqueia antes da releitura e usa updateMany condicional', async () => {
      const { service, prisma, tx } = criarContexto();
      await service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
        status: 'EM_ANDAMENTO',
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.ordemServico.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.ordemServico.updateMany).toHaveBeenCalledWith({
        where: { id: 'ordem-1', empresaId: 'empresa-1', status: 'ABERTA' },
        data: { status: 'EM_ANDAMENTO', dataConclusao: undefined },
      });
    });

    it('conclui e registra histórico dentro do mesmo tx', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findFirst.mockResolvedValue({
        ...ordem,
        status: 'EM_ANDAMENTO',
      });
      await service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
        status: 'CONCLUIDA',
      });
      const chamadaAtualizacao = (
        tx.ordemServico.updateMany.mock.calls as Array<
          [Prisma.OrdemServicoUpdateManyArgs]
        >
      )[0][0];
      expect(chamadaAtualizacao.where).toMatchObject({
        status: 'EM_ANDAMENTO',
      });
      expect(chamadaAtualizacao.data).toMatchObject({
        status: 'CONCLUIDA',
      });
      expect(chamadaAtualizacao.data.dataConclusao).toBeInstanceOf(Date);
      const chamadaHistorico = (
        tx.ordemServicoHistorico.create.mock.calls as Array<
          [Prisma.OrdemServicoHistoricoCreateArgs]
        >
      )[0][0];
      expect(chamadaHistorico.data).toMatchObject({
        statusAnterior: 'EM_ANDAMENTO',
        statusNovo: 'CONCLUIDA',
      });
    });

    it.each([
      ['CONCLUIDA', 'CANCELADA'],
      ['CANCELADA', 'EM_ANDAMENTO'],
      ['EM_ANDAMENTO', 'ABERTA'],
      ['ABERTA', 'ABERTA'],
    ])('rejeita transição %s -> %s sem efeitos', async (anterior, novo) => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findFirst.mockResolvedValue({
        ...ordem,
        status: anterior,
      });
      await expect(
        service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
          status: novo,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
      expect(tx.ordemServicoHistorico.create).not.toHaveBeenCalled();
    });

    it('não cria histórico quando a atualização condicional perde a corrida', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
          status: 'EM_ANDAMENTO',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.ordemServicoHistorico.create).not.toHaveBeenCalled();
    });

    it('simula segunda conclusão vendo o estado já concluído', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findFirst.mockResolvedValue({
        ...ordem,
        status: 'CONCLUIDA',
      });
      await expect(
        service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
          status: 'CONCLUIDA',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.ordemServico.updateMany).not.toHaveBeenCalled();
    });

    it('rejeita ordem de outra empresa após lock', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findFirst.mockResolvedValue(null);
      await expect(
        service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
          status: 'EM_ANDAMENTO',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propaga falha do histórico e não executa a releitura final', async () => {
      const { service, tx } = criarContexto();
      const falha = new Error('falha no histórico');
      tx.ordemServicoHistorico.create.mockRejectedValue(falha);
      await expect(
        service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
          status: 'EM_ANDAMENTO',
        }),
      ).rejects.toBe(falha);
      expect(tx.ordemServico.findFirstOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('adicionarHistorico', () => {
    it('usa transação, lock antes da releitura e o mesmo tx', async () => {
      const { service, prisma, tx } = criarContexto();
      await service.adicionarHistorico('empresa-1', 'ordem-1', 'usuario-1', {
        descricao: 'Diagnóstico registrado',
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.ordemServico.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.ordemServicoHistorico.create).toHaveBeenCalledTimes(1);
    });

    it('não grava histórico para tenant incorreto', async () => {
      const { service, tx } = criarContexto();
      tx.ordemServico.findFirst.mockResolvedValue(null);
      await expect(
        service.adicionarHistorico('empresa-1', 'ordem-1', 'usuario-1', {
          descricao: 'Tentativa',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.ordemServicoHistorico.create).not.toHaveBeenCalled();
    });
  });
  describe('isolamento tenant-aware', () => {
    it('lista e conta pelo mesmo empresaId sem modo global', async () => {
      const { service, prisma } = criarContexto();
      prisma.ordemServico.findMany.mockResolvedValue([]);
      prisma.ordemServico.count.mockResolvedValue(0);
      prisma.$transaction.mockImplementationOnce((operacoes: unknown) =>
        Promise.all(operacoes as Promise<unknown>[]),
      );
      await service.listar('empresa-1', { page: 1, limit: 10 });
      expect(prisma.ordemServico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'empresa-1' } }),
      );
      expect(prisma.ordemServico.count).toHaveBeenCalledWith({
        where: { empresaId: 'empresa-1' },
      });
    });

    it('busca detalhe diretamente por id e empresaId', async () => {
      const { service, prisma } = criarContexto();
      prisma.ordemServico.findFirst.mockResolvedValue(ordem);
      await service.buscarPorId('empresa-1', 'ordem-1');
      expect(prisma.ordemServico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ordem-1', empresaId: 'empresa-1' },
        }),
      );
    });

    it('retorna o mesmo 404 para ordem inexistente ou externa', async () => {
      const { service, prisma } = criarContexto();
      prisma.ordemServico.findFirst.mockResolvedValue(null);
      await expect(
        service.buscarPorId('empresa-1', 'inexistente'),
      ).rejects.toThrow('Ordem de serviço não encontrada');
      await expect(service.buscarPorId('empresa-1', 'externa')).rejects.toThrow(
        'Ordem de serviço não encontrada',
      );
    });

    it('parametriza o lock com ordem e empresa antes da releitura', async () => {
      const { service, tx } = criarContexto();
      await service.alterarStatus('empresa-1', 'ordem-1', 'usuario-1', {
        status: 'EM_ANDAMENTO',
      });
      const chamada = tx.$queryRaw.mock.calls[0] as [
        TemplateStringsArray,
        string,
        string,
      ];
      expect(chamada[1]).toBe('ordem-1');
      expect(chamada[2]).toBe('empresa-1');
      expect(tx.ordemServico.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ordem-1', empresaId: 'empresa-1' },
        }),
      );
    });
  });
});

// Estes testes unitários usam mocks e não comprovam locks, concorrência,
// rollback físico ou deadlocks reais no PostgreSQL.
