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
  const usuario = { id: 'u1', empresaId: 'e1', tipo: 'USUARIO_EMPRESA' };
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
        update: jest.fn().mockResolvedValue(evento),
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
        findUnique: jest.fn(),
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
      await service.criar(dto, usuario);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.cliente.findFirst).toHaveBeenCalled();
      expect(tx.usuario.findFirst).toHaveBeenCalled();
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.agendaEvento.findFirst).toHaveBeenCalled();
      expect(tx.agendaEvento.create).toHaveBeenCalled();
    });

    it('valida cliente no tenant e aceita cliente válido', async () => {
      const { service, tx } = criarContexto();
      await service.criar(dto, usuario);
      expect(tx.cliente.findFirst).toHaveBeenCalledWith({
        where: { id: 'c1', empresaId: 'e1' },
      });
    });

    it.each(['inexistente', 'de outra empresa'])(
      'rejeita cliente %s sem revelar outro tenant',
      async () => {
        const { service, tx } = criarContexto();
        tx.cliente.findFirst.mockResolvedValue(null);
        await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
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
      await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('valida responsável no tenant e aceita responsável válido', async () => {
      const { service, tx } = criarContexto();
      await service.criar(dto, usuario);
      expect(tx.usuario.findFirst).toHaveBeenCalledWith({
        where: { id: 'u1', empresaId: 'e1' },
      });
    });

    it.each(['inexistente', 'de outra empresa'])(
      'rejeita responsável %s sem revelar outro tenant',
      async () => {
        const { service, tx } = criarContexto();
        tx.usuario.findFirst.mockResolvedValue(null);
        await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
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
      await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
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
        service.criar({ ...dto, dataInicio, dataFim }, usuario),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('força AGENDADO sem utilizar status injetado pelo consumidor', async () => {
      const { service, tx } = criarContexto();
      const entradaMaliciosa = { ...dto, status: 'CONCLUIDO' };
      await service.criar(entradaMaliciosa, usuario);
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
        service.criar(dadosSemResponsavel, {
          empresaId: 'e1',
        } as unknown as import('./agenda.service').UsuarioAgendaAutenticado),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('adquire advisory lock antes de consultar conflito', async () => {
      const { service, tx } = criarContexto();
      await service.criar(dto, usuario);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.agendaEvento.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.$queryRaw.mock.calls[0][1]).toBe('agenda:e1:u1');
    });

    it('rejeita evento sobreposto antes da criação', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.findFirst.mockReset().mockResolvedValue({ id: 'a2' });
      await expect(service.criar(dto, usuario)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.agendaEvento.create).not.toHaveBeenCalled();
    });

    it('usa desigualdades estritas, permite contiguidade e ignora cancelados', async () => {
      const { service, tx } = criarContexto();
      await service.criar(dto, usuario);
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
      await service.criar(dto, usuario);
      const ordemCriacao = tx.agendaEvento.create.mock.invocationCallOrder[0];
      expect(tx.cliente.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
        ordemCriacao,
      );
      expect(tx.usuario.findFirst.mock.invocationCallOrder[0]).toBeLessThan(
        ordemCriacao,
      );
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        ordemCriacao,
      );
      expect(
        tx.agendaEvento.findFirst.mock.invocationCallOrder[0],
      ).toBeLessThan(ordemCriacao);
    });

    it('propaga falha posterior e rejeita a operação transacional', async () => {
      const { service, tx } = criarContexto();
      tx.agendaEvento.create.mockRejectedValue(new Error('falha de escrita'));
      await expect(service.criar(dto, usuario)).rejects.toThrow(
        'falha de escrita',
      );
    });
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
      await service.atualizar('a1', { descricao: 'Nova' }, usuario);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.agendaEvento.findFirst.mock.invocationCallOrder[0],
      );
      expect(tx.agendaEvento.update).toHaveBeenCalled();
    });

    it('retorna não encontrado para tenant incorreto', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.agendaEvento.findFirst.mockReset().mockResolvedValue(null);
      await expect(
        service.atualizar('a1', { descricao: 'Nova' }, usuario),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.agendaEvento.update).not.toHaveBeenCalled();
    });

    it('combina apenas início novo com fim atual', async () => {
      const { service, tx } = prepararAtualizacao();
      const novoInicio = '2026-07-23T09:30:00.000Z';
      await service.atualizar('a1', { dataInicio: novoInicio }, usuario);
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
      await service.atualizar('a1', { dataFim: novoFim }, usuario);
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
        service.atualizar(
          'a1',
          { dataInicio: '2026-07-23T10:00:00.000Z' },
          usuario,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.agendaEvento.update).not.toHaveBeenCalled();
    });

    it('na troca de responsável bloqueia antigo e novo em ordem determinística', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.usuario.findFirst.mockResolvedValue({
        id: 'u2',
        empresaId: 'e1',
        ativo: true,
      });
      await service.atualizar('a1', { usuarioId: 'u2' }, usuario);
      const chaves = tx.$queryRaw.mock.calls.slice(1).map((call) => call[1]);
      expect(chaves).toEqual(['agenda:e1:u1', 'agenda:e1:u2']);
    });

    it('exclui o próprio evento da consulta de conflito', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('a1', { dataFim: fim }, usuario);
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
        service.atualizar('a1', { dataFim: fim }, usuario),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.agendaEvento.update).not.toHaveBeenCalled();
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
        service.atualizar('a1', { clienteId: 'c2' }, usuario),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.ordemServico.findFirst).toHaveBeenCalledWith({
        where: {
          agendaEventoId: 'a1',
          empresaId: 'e1',
          clienteId: { not: 'c2' },
        },
        select: { id: true },
      });
      expect(tx.agendaEvento.update).not.toHaveBeenCalled();
    });

    it('permite alteração válida de cliente após validar Ordens de Serviço', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.cliente.findFirst.mockResolvedValue({
        id: 'c2',
        empresaId: 'e1',
        ativo: true,
      });
      await service.atualizar('a1', { clienteId: 'c2' }, usuario);
      expect(tx.ordemServico.findFirst).toHaveBeenCalled();
      expect(tx.agendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clienteId: 'c2' }),
        }),
      );
    });

    it('clienteId undefined mantém o cliente e não consulta Ordens de Serviço', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('a1', { clienteId: undefined }, usuario);
      expect(tx.ordemServico.findFirst).not.toHaveBeenCalled();
      expect(tx.agendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clienteId: undefined }),
        }),
      );
    });

    it('permite remover cliente quando não há Ordem de Serviço vinculada', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('a1', { clienteId: null }, usuario);
      expect(tx.cliente.findFirst).not.toHaveBeenCalled();
      expect(tx.ordemServico.findFirst).toHaveBeenCalledWith({
        where: {
          agendaEventoId: 'a1',
          empresaId: 'e1',
        },
        select: { id: true },
      });
      expect(tx.agendaEvento.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clienteId: null }),
        }),
      );
    });

    it('impede remover cliente quando há Ordem de Serviço vinculada', async () => {
      const { service, tx } = prepararAtualizacao();
      tx.ordemServico.findFirst.mockResolvedValue({ id: 'os1' });
      await expect(
        service.atualizar('a1', { clienteId: null }, usuario),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.agendaEvento.update).not.toHaveBeenCalled();
    });

    it('permite evento contíguo por usar comparação estrita', async () => {
      const { service, tx } = prepararAtualizacao();
      await service.atualizar('a1', { dataInicio: inicio }, usuario);
      expect(tx.agendaEvento.update).toHaveBeenCalled();
    });

    it('alteração somente textual não adquire advisory lock nem consulta conflito', async () => {
      const { service, tx } = prepararAtualizacao();
      await expect(
        service.atualizar('a1', { descricao: 'Nova' }, usuario),
      ).resolves.toEqual(expect.objectContaining({ status: 'AGENDADO' }));
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(tx.agendaEvento.findFirst).toHaveBeenCalledTimes(1);
      expect(tx.ordemServico.findFirst).not.toHaveBeenCalled();
      const dadosAtualizacao = tx.agendaEvento.update.mock.calls[0][0].data;
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
      await service.adicionarHistorico('a1', { descricao: 'Nota' }, usuario);
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
        service.adicionarHistorico('a1', { descricao: 'Nota' }, usuario),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.agendaEventoHistorico.create).not.toHaveBeenCalled();
    });

    it('registra o usuário autenticado pelo contexto real', async () => {
      const { service, tx } = prepararHistorico();
      await service.adicionarHistorico(
        'a1',
        { descricao: 'Nota' },
        { id: 'jwt-user', empresaId: 'e1' },
      );
      expect(tx.agendaEventoHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: 'jwt-user' }),
        }),
      );
    });
  });
});
