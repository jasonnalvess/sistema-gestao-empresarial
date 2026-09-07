/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- Matchers e mock.calls do Jest expõem valores como any. */
/* Testes unitários com mocks não comprovam locks, concorrência, phantom, rollback físico ou deadlocks reais no PostgreSQL. */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgendaService } from './agenda.service';

describe('AgendaService', () => {
  const inicio = '2026-07-23T09:00:00.000Z';
  const fim = '2026-07-23T10:00:00.000Z';
  const dto = {
    titulo: 'Visita',
    dataInicio: inicio,
    dataFim: fim,
    clienteId: 'c1',
    usuarioId: 'u1',
  };
  const evento = {
    id: 'a1',
    titulo: 'Visita',
    descricao: null,
    dataInicio: new Date(inicio),
    dataFim: new Date(fim),
    status: 'AGENDADO',
    local: null,
    clienteNome: null,
    clienteContato: null,
    ativo: true,
    empresaId: 'e1',
    usuarioId: 'u1',
    clienteId: 'c1',
    createdAt: new Date(),
    updatedAt: new Date(),
    cliente: null,
  };

  function criarContexto() {
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([]),
      cliente: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'c1', empresaId: 'e1', ativo: true }),
      },
      usuario: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'u1', empresaId: 'e1', ativo: true }),
      },
      agendaEvento: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValue(evento),
        create: jest.fn().mockResolvedValue(evento),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findFirstOrThrow: jest.fn().mockResolvedValue(evento),
      },
      agendaEventoHistorico: {
        create: jest.fn().mockResolvedValue({ id: 'h1' }),
      },
      ordemServico: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      agendaEvento: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      agendaEventoHistorico: {
        findMany: jest.fn(),
      },
    };
    const service = new AgendaService(prisma as unknown as PrismaService);
    return { service, prisma, tx };
  }

  describe('criar', () => {
    it('usa transação e o mesmo tx em todas as operações críticas', async () => {
      const { service, prisma, tx } = criarContexto();
      await service.criar('e1', 'u1', dto);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.cliente.findFirst).toHaveBeenCalled();
      expect(tx.usuario.findFirst).toHaveBeenCalled();
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.agendaEvento.findFirst).toHaveBeenCalled();
      expect(tx.agendaEvento.create).toHaveBeenCalled();
    });

    it('valida cliente no tenant e aceita cliente válido', async () => {
      const { service, tx } = criarContexto();
      await service.criar('e1', 'u1', dto);
      expect(tx.cliente.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1', empresaId: 'e1' },
      });
    });

    it.each(['inexistente', 'de outra empresa'])(
      'rejeita cliente %s sem revelar outro tenant',
      async () => {
        const { service, tx } = criarContexto();
        tx.cliente.findFirst.mockResolvedValue(null);
        await expect(service.criar('e1', 'u1', dto)).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(tx.agendaEvento.create).not.toHaveBeenCalled();
      },
    );

    it('rejeita cliente inativo', async () => {
      const { service, tx } = criarContexto();
      tx.cliente.findFirst.mockResolvedValue({
        id: 'c1',
        empresaId: 'e1',
        ativo: false,
      });
      await expect(service.criar('e1', 'u1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('valida responsável no tenant e aceita responsável válido', async () => {
      const { service, tx } = criarContexto();
      await service.criar('e1', 'u1', dto);
      expect(tx.usuario.findFirst).toHaveBeenCalledWith({
        where: { id: 'u1', empresaId: 'e1' },
      });
    });

    it.each(['inexistente', 'de outra empresa'])(
      'rejeita responsável %s sem revelar outro tenant',
      async () => {
        const { service, tx } = criarContexto();
        tx.usuario.findFirst.mockResolvedValue(null);
        await expect(service.criar('e1', 'u1', dto)).rejects.toBeInstanceOf(
          NotFoundException,
        );
      },
    );

    it('rejeita responsável inativo', async () => {
      const { service, tx } = criarContexto();
      tx.usuario.findFirst.mockResolvedValue({
        id: 'u1',
        empresaId: 'e1',
        ativo: false,
      });
      await expect(service.criar('e1', 'u1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it.each([
      ['início inválido', 'inválida', fim],
      ['fim inválido', inicio, 'inválida'],
      ['fim anterior', fim, inicio],
      ['duração zero', inicio, inicio],
    ])('rejeita %s', async (_caso, dataInicio, dataFim) => {
      const { service, prisma } = criarContexto();
      await expect(
        service.criar('e1', 'u1', { ...dto, dataInicio, dataFim }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('força AGENDADO sem utilizar status injetado pelo consumidor', async () => {
      const { service, tx } = criarContexto();
      const entradaMaliciosa = { ...dto, status: 'CONCLUIDO' };
      await service.criar('e1', 'u1', entradaMaliciosa);
      const dadosCriacao = tx.agendaEvento.create.mock.calls[0][0].data;
      expect(dadosCriacao.status).toBe('AGENDADO');
      expect(dadosCriacao.status).not.toBe('CONCLUIDO');
    });

    it('rejeita contexto sem identificador ao atribuir responsável padrão', async () => {
      const { service, prisma } = criarContexto();
      const dadosSemResponsavel = {
        titulo: dto.titulo,
        dataInicio: dto.dataInicio,
        dataFim: dto.dataFim,
        clienteId: dto.clienteId,
      };
      await expect(
        service.criar('e1', '', dadosSemResponsavel),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('adquire advisory lock antes de consultar conflito', async () => {
      const { service, tx } = criarContexto();
      await service.criar('e1', 'u1', dto);
      expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.agendaEvento.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.$executeRaw.mock.calls[0][0]).toEqual(
        expect.arrayContaining([
          expect.stringContaining('pg_advisory_xact_lock'),
        ]),
      );
      expect(tx.$executeRaw.mock.calls[0][1]).toBe('agenda:e1:u1');
      expect(tx.$queryRaw).not.toHaveBeenCalled();
    });

    it('rejeita evento sobreposto antes da criação', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.findFirst.mockReset().mockResolvedValue({ id: 'a2' });
      await expect(service.criar('e1', 'u1', dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.agendaEvento.create).not.toHaveBeenCalled();
    });

    it('usa desigualdades estritas, permite contiguidade e ignora cancelados', async () => {
      const { service, tx } = criarContexto();
      await service.criar('e1', 'u1', dto);
      expect(tx.agendaEvento.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { not: 'CANCELADO' },
          dataInicio: { lt: new Date(fim) },
          dataFim: { gt: new Date(inicio) },
        }),
        select: { id: true },
      });
    });

    it('cria somente após validações, lock e consulta de conflito', async () => {
      const { service, tx } = criarContexto();
      await service.criar('e1', 'u1', dto);
      const ordemCriacao = tx.agendaEvento.create.mock.invocationCallOrder[0];
      expect(tx.cliente.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
        ordemCriacao,
      );
      expect(tx.usuario.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
        ordemCriacao,
      );
      expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
        ordemCriacao,
      );
      expect(
        tx.agendaEvento.findFirst.mock.invocationCallOrder[0],
      ).toBeLessThan(ordemCriacao);
    });

    it('propaga falha posterior e rejeita a operação transacional', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.create.mockRejectedValue(new Error('falha de escrita'));
      await expect(service.criar('e1', 'u1', dto)).rejects.toThrow(
        'falha de escrita',
      );
    });
  });

  describe('consultas tenant-aware', () => {
    it('lista sempre com empresaId explícito', async () => {
      const { service, prisma } = criarContexto();
      prisma.agendaEvento.findMany.mockResolvedValue([]);
      await service.listar('e1');
      expect(prisma.agendaEvento.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'e1' } }),
      );
    });

    it.each(['inexistente', 'externo'])(
      'retorna o mesmo 404 para evento %s',
      async () => {
        const { service, prisma } = criarContexto();
        prisma.agendaEvento.findFirst.mockResolvedValue(null);
        await expect(service.buscarPorId('e1', 'a1')).rejects.toThrow(
          'Evento não encontrado',
        );
        expect(prisma.agendaEvento.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 'a1', empresaId: 'e1' } }),
        );
      },
    );
  });

  describe('atualizar', () => {
    function prepararAtualizacao() {
      const contexto = criarContexto();
      contexto.tx.agendaEvento.findFirst.mockReset();
      contexto.tx.agendaEvento.findFirst
        .mockResolvedValueOnce(evento)
        .mockResolvedValueOnce(null);
      return contexto;
    }

    it('abre transação, executa FOR UPDATE antes da releitura e atualiza com tx', async () => {
      const { service, prisma, tx } = prepararAtualizacao();
      await service.atualizar('e1', 'a1', 'u1', { descricao: 'Nova' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.agendaEvento.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.$queryRaw.mock.calls[0][1]).toBe('a1');
      expect(tx.$queryRaw.mock.calls[0][2]).toBe('e1');
      expect(tx.agendaEvento.updateMany).toHaveBeenCalled();
    });

    it('retorna não encontrado para tenant incorreto', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.agendaEvento.findFirst.mockReset().mockResolvedValue(null);
      await expect(
        service.atualizar('e1', 'a1', 'u1', { descricao: 'Nova' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.agendaEvento.updateMany).not.toHaveBeenCalled();
    });

    it('combina apenas início novo com fim atual', async () => {
      const { service, tx } = prepararAtualizacao();
      const novoInicio = '2026-07-23T09:30:00.000Z';
      await service.atualizar('e1', 'a1', 'u1', { dataInicio: novoInicio });
      expect(tx.agendaEvento.findFirst).toHaveBeenLastCalledWith({
        where: expect.objectContaining({
          dataInicio: { lt: evento.dataFim },
          dataFim: { gt: new Date(novoInicio) },
        }),
        select: { id: true },
      });
    });

    it('combina apenas fim novo com início atual', async () => {
      const { service, tx } = prepararAtualizacao();
      const novoFim = '2026-07-23T11:00:00.000Z';
      await service.atualizar('e1', 'a1', 'u1', { dataFim: novoFim });
      expect(tx.agendaEvento.findFirst).toHaveBeenLastCalledWith({
        where: expect.objectContaining({
          dataInicio: { lt: new Date(novoFim) },
          dataFim: { gt: evento.dataInicio },
        }),
        select: { id: true },
      });
    });

    it('rejeita intervalo final inválido em atualização parcial', async () => {
      const { service, tx } = prepararAtualizacao();
      await expect(
        service.atualizar('e1', 'a1', 'u1', {
          dataInicio: '2026-07-23T10:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.agendaEvento.updateMany).not.toHaveBeenCalled();
    });

    it('na troca de responsável bloqueia antigo e novo em ordem determinística', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.usuario.findFirst.mockResolvedValue({
        id: 'u2',
        empresaId: 'e1',
        ativo: true,
      });
      await service.atualizar('e1', 'a1', 'u1', { usuarioId: 'u2' });
      const chaves = tx.$executeRaw.mock.calls.map((call) => call[1]);
      expect(chaves).toEqual(['agenda:e1:u1', 'agenda:e1:u2']);
    });

    it('exclui o próprio evento da consulta de conflito', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('e1', 'a1', 'u1', { dataFim: fim });
      expect(tx.agendaEvento.findFirst).toHaveBeenLastCalledWith({
        where: expect.objectContaining({ id: { not: 'a1' } }),
        select: { id: true },
      });
    });

    it('rejeita conflito e não atualiza', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.agendaEvento.findFirst
        .mockReset()
        .mockResolvedValueOnce(evento)
        .mockResolvedValueOnce({ id: 'a2' });
      await expect(
        service.atualizar('e1', 'a1', 'u1', { dataFim: fim }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.agendaEvento.updateMany).not.toHaveBeenCalled();
    });

    it('impede cliente divergente de ordem de serviço vinculada', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.cliente.findFirst.mockResolvedValue({
        id: 'c2',
        empresaId: 'e1',
        ativo: true,
      });
      tx.ordemServico.findFirst.mockResolvedValue({ id: 'os1' });
      await expect(
        service.atualizar('e1', 'a1', 'u1', { clienteId: 'c2' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.ordemServico.findFirst).toHaveBeenCalledWith({
        where: {
          agendaEventoId: 'a1',
          empresaId: 'e1',
          clienteId: { not: 'c2' },
        },
        select: { id: true },
      });
      expect(tx.agendaEvento.updateMany).not.toHaveBeenCalled();
    });

    it('permite alteração válida de cliente após validar Ordens de Serviço', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.cliente.findFirst.mockResolvedValue({
        id: 'c2',
        empresaId: 'e1',
        ativo: true,
      });
      await service.atualizar('e1', 'a1', 'u1', { clienteId: 'c2' });
      expect(tx.ordemServico.findFirst).toHaveBeenCalled();
      expect(tx.agendaEvento.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clienteId: 'c2' }),
        }),
      );
    });

    it('clienteId undefined mantém o cliente e não consulta Ordens de Serviço', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('e1', 'a1', 'u1', { clienteId: undefined });
      expect(tx.ordemServico.findFirst).not.toHaveBeenCalled();
      expect(tx.agendaEvento.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clienteId: undefined }),
        }),
      );
    });

    it('permite remover cliente quando não há Ordem de Serviço vinculada', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('e1', 'a1', 'u1', { clienteId: null });
      expect(tx.cliente.findFirst).not.toHaveBeenCalled();
      expect(tx.ordemServico.findFirst).toHaveBeenCalledWith({
        where: {
          agendaEventoId: 'a1',
          empresaId: 'e1',
        },
        select: { id: true },
      });
      expect(tx.agendaEvento.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clienteId: null }),
        }),
      );
    });

    it('impede remover cliente quando há Ordem de Serviço vinculada', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.ordemServico.findFirst.mockResolvedValue({ id: 'os1' });
      await expect(
        service.atualizar('e1', 'a1', 'u1', { clienteId: null }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.agendaEvento.updateMany).not.toHaveBeenCalled();
    });

    it('permite evento contíguo por usar comparação estrita', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('e1', 'a1', 'u1', { dataInicio: inicio });
      expect(tx.agendaEvento.updateMany).toHaveBeenCalled();
    });

    it('alteração somente textual não adquire advisory lock nem consulta conflito', async () => {
      const { service, tx } = prepararAtualizacao();
      await expect(
        service.atualizar('e1', 'a1', 'u1', { descricao: 'Nova' }),
      ).resolves.toEqual(expect.objectContaining({ status: 'AGENDADO' }));
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(tx.agendaEvento.findFirst).toHaveBeenCalledTimes(1);
      expect(tx.ordemServico.findFirst).not.toHaveBeenCalled();
      const dadosAtualizacao = tx.agendaEvento.updateMany.mock.calls[0][0].data;
      expect(dadosAtualizacao).not.toHaveProperty('status');
    });
  });

  describe('histórico manual', () => {
    function prepararHistorico() {
      const contexto = criarContexto();
      contexto.tx.agendaEvento.findFirst.mockReset().mockResolvedValue(evento);
      return contexto;
    }

    it('bloqueia e valida evento da mesma empresa na transação', async () => {
      const { service, prisma, tx } = prepararHistorico();
      await service.adicionarHistorico('e1', 'a1', 'u1', { descricao: 'Nota' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.agendaEvento.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.agendaEventoHistorico.create).toHaveBeenCalled();
    });

    it('não escreve histórico para evento de outra empresa', async () => {
      const { service, tx } = prepararHistorico();
      tx.agendaEvento.findFirst.mockResolvedValue(null);
      await expect(
        service.adicionarHistorico('e1', 'a1', 'u1', { descricao: 'Nota' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.agendaEventoHistorico.create).not.toHaveBeenCalled();
    });

    it('registra o usuário autenticado pelo contexto real', async () => {
      const { service, tx } = prepararHistorico();
      await service.adicionarHistorico('e1', 'a1', 'jwt-user', {
        descricao: 'Nota',
      });
      expect(tx.agendaEventoHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: 'jwt-user' }),
        }),
      );
    });
  });

  describe('status e cancelamento', () => {
    it('rejeita CANCELADO pelo endpoint geral antes da transação', async () => {
      const { service, prisma } = criarContexto();
      await expect(
        service.atualizar('e1', 'a1', 'u1', {
          status: 'CANCELADO',
        } as never),
      ).rejects.toThrow(
        'Para cancelar um evento, utilize a operação de cancelamento.',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('cancela por tenant, registra autoria e histórico na transação', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.findFirst.mockReset().mockResolvedValue(evento);
      await service.cancelar('e1', 'a1', 'u1');
      expect(tx.agendaEvento.updateMany).toHaveBeenCalledWith({
        where: { id: 'a1', empresaId: 'e1', status: 'AGENDADO' },
        data: { status: 'CANCELADO' },
      });
      expect(tx.agendaEventoHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: 'u1' }),
        }),
      );
    });

    it('é idempotente e não duplica histórico quando já cancelado', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.findFirst.mockReset().mockResolvedValue({
        ...evento,
        status: 'CANCELADO',
      });
      await service.cancelar('e1', 'a1', 'u1');
      expect(tx.agendaEvento.updateMany).not.toHaveBeenCalled();
      expect(tx.agendaEventoHistorico.create).not.toHaveBeenCalled();
    });

    it('não bloqueia nem altera evento externo', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.findFirst.mockReset().mockResolvedValue(null);
      await expect(service.cancelar('e1', 'a-externo', 'u1')).rejects.toThrow(
        'Evento não encontrado',
      );
      expect(tx.agendaEvento.updateMany).not.toHaveBeenCalled();
    });
  });
});
