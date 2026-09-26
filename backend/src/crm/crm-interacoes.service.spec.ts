/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Mocks do Jest expõem valores como any. */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoInteracaoCRM } from '@prisma/client';
import { validate } from 'class-validator';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CrmInteracoesService } from './crm-interacoes.service';
import { AtualizarClienteInteracaoDto } from './dto/atualizar-cliente-interacao.dto';
import { CriarClienteInteracaoDto } from './dto/criar-cliente-interacao.dto';
import { FiltroClienteInteracoesDto } from './dto/filtro-cliente-interacoes.dto';

describe('CrmInteracoesService', () => {
  const empresaId = 'empresa-a';
  const usuarioAutorId = 'usuario-autor';
  const uuid = '11111111-1111-4111-8111-111111111111';
  const dto = {
    clienteId: 'cliente-a',
    responsavelId: 'usuario-responsavel',
    tipo: TipoInteracaoCRM.REUNIAO,
    assunto: 'Reunião inicial',
    descricao: 'Descrição da interação',
    dataHora: '2026-09-19T12:00:00.000Z',
  };
  const antes = {
    id: 'interacao-a',
    empresaId,
    clienteId: dto.clienteId,
    oportunidadeId: null,
    agendaEventoId: null,
    responsavelId: dto.responsavelId,
    tipo: dto.tipo,
    assunto: dto.assunto,
    descricao: dto.descricao,
    dataHora: new Date(dto.dataHora),
    versaoRegistro: 0,
  };
  const depois = {
    ...antes,
    descricao: 'Descrição atualizada',
    versaoRegistro: 1,
  };

  function contexto() {
    const tx = {
      cliente: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: dto.clienteId, ativo: true }),
      },
      usuario: {
        findFirst: jest.fn().mockResolvedValue({ id: dto.responsavelId }),
      },
      crmOportunidade: { findFirst: jest.fn() },
      agendaEvento: { findFirst: jest.fn() },
      clienteInteracao: {
        create: jest.fn().mockResolvedValue(antes),
        findFirst: jest.fn().mockResolvedValue(antes),
        findFirstOrThrow: jest.fn().mockResolvedValue(depois),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditoriaLog: { create: jest.fn().mockResolvedValue({ id: 'audit-a' }) },
    };
    const prisma = {
      $transaction: jest.fn(
        (arg: ((client: typeof tx) => unknown) | unknown[]) =>
          typeof arg === 'function' ? arg(tx) : Promise.all(arg),
      ),
      clienteInteracao: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    return {
      tx,
      prisma,
      service: new CrmInteracoesService(prisma as unknown as PrismaService),
    };
  }

  it('cria interação e auditoria no mesmo transaction client, com autoria do executor', async () => {
    const { service, prisma, tx } = contexto();

    await service.criar(empresaId, usuarioAutorId, dto);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(tx.clienteInteracao.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        empresaId,
        responsavelId: dto.responsavelId,
      }),
    });
    expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        empresaId,
        usuarioId: usuarioAutorId,
        entidade: AuditoriaEntidade.CLIENTE_INTERACAO_CRM,
        entidadeId: antes.id,
        acao: AuditoriaAcao.CRIAR_INTERACAO_CRM,
        dadosAntigos: undefined,
        dadosNovos: expect.objectContaining({
          id: antes.id,
          responsavelId: dto.responsavelId,
        }),
      }),
    });
  });

  it('rejeita cliente de outro tenant antes de criar interação ou auditoria', async () => {
    const { service, tx } = contexto();
    tx.cliente.findFirst.mockResolvedValue(null);

    await expect(
      service.criar(empresaId, usuarioAutorId, dto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.clienteInteracao.create).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });

  it('traduz dataInicial para gte em dataHora', async () => {
    const { service, prisma } = contexto();
    prisma.clienteInteracao.findMany.mockResolvedValue([]);
    prisma.clienteInteracao.count.mockResolvedValue(0);

    await service.listar(empresaId, {
      dataInicial: '2026-09-01T00:00:00.000Z',
    });

    expect(prisma.clienteInteracao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId,
          dataHora: { gte: new Date('2026-09-01T00:00:00.000Z') },
        }),
      }),
    );
  });

  it('traduz dataFinal para lte em dataHora', async () => {
    const { service, prisma } = contexto();
    prisma.clienteInteracao.findMany.mockResolvedValue([]);
    prisma.clienteInteracao.count.mockResolvedValue(0);

    await service.listar(empresaId, { dataFinal: '2026-09-30T23:59:59.000Z' });

    expect(prisma.clienteInteracao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId,
          dataHora: { lte: new Date('2026-09-30T23:59:59.000Z') },
        }),
      }),
    );
  });

  it('cria interação quando o evento da agenda possui o mesmo cliente', async () => {
    const { service, tx } = contexto();
    tx.agendaEvento.findFirst.mockResolvedValue({
      id: 'agenda-a',
      clienteId: dto.clienteId,
    });

    await service.criar(empresaId, usuarioAutorId, {
      ...dto,
      agendaEventoId: 'agenda-a',
    });

    expect(tx.agendaEvento.findFirst).toHaveBeenCalledWith({
      where: { id: 'agenda-a', empresaId },
      select: { id: true, clienteId: true },
    });
    expect(tx.clienteInteracao.create).toHaveBeenCalled();
    expect(tx.auditoriaLog.create).toHaveBeenCalled();
  });

  it('rejeita criação com evento da agenda de outro cliente', async () => {
    const { service, tx } = contexto();
    tx.agendaEvento.findFirst.mockResolvedValue({
      id: 'agenda-a',
      clienteId: 'cliente-b',
    });

    await expect(
      service.criar(empresaId, usuarioAutorId, {
        ...dto,
        agendaEventoId: 'agenda-a',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.agendaEvento.findFirst).toHaveBeenCalledWith({
      where: { id: 'agenda-a', empresaId },
      select: { id: true, clienteId: true },
    });
    expect(tx.clienteInteracao.create).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });

  it('rejeita criação com evento da agenda sem cliente', async () => {
    const { service, tx } = contexto();
    tx.agendaEvento.findFirst.mockResolvedValue({
      id: 'agenda-a',
      clienteId: null,
    });

    await expect(
      service.criar(empresaId, usuarioAutorId, {
        ...dto,
        agendaEventoId: 'agenda-a',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.agendaEvento.findFirst).toHaveBeenCalledWith({
      where: { id: 'agenda-a', empresaId },
      select: { id: true, clienteId: true },
    });
    expect(tx.clienteInteracao.create).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });

  it('rejeita atualização que vincula evento da agenda sem cliente', async () => {
    const { service, tx } = contexto();
    tx.clienteInteracao.findFirst.mockResolvedValue(antes);
    tx.agendaEvento.findFirst.mockResolvedValue({
      id: 'agenda-a',
      clienteId: null,
    });

    await expect(
      service.atualizar(empresaId, antes.id, usuarioAutorId, {
        agendaEventoId: 'agenda-a',
        versaoRegistro: antes.versaoRegistro,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.agendaEvento.findFirst).toHaveBeenCalledWith({
      where: { id: 'agenda-a', empresaId },
      select: { id: true, clienteId: true },
    });
    expect(tx.clienteInteracao.updateMany).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });

  it('atualiza com optimistic locking e registra estados anterior e posterior', async () => {
    const { service, tx } = contexto();
    tx.clienteInteracao.findFirst.mockResolvedValue(antes);
    tx.clienteInteracao.findFirstOrThrow.mockResolvedValue(depois);

    await service.atualizar(empresaId, 'interacao-a', usuarioAutorId, {
      descricao: depois.descricao,
      versaoRegistro: 0,
    });

    expect(tx.clienteInteracao.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'interacao-a', empresaId, versaoRegistro: 0 },
        data: expect.objectContaining({ versaoRegistro: { increment: 1 } }),
      }),
    );
    expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuarioId: usuarioAutorId,
        acao: AuditoriaAcao.ATUALIZAR_INTERACAO_CRM,
        dadosAntigos: expect.objectContaining({
          descricao: antes.descricao,
          versaoRegistro: 0,
        }),
        dadosNovos: expect.objectContaining({
          descricao: depois.descricao,
          versaoRegistro: 1,
        }),
      }),
    });
  });

  it('rejeita versão desatualizada antes de atualizar ou auditar', async () => {
    const { service, tx } = contexto();
    tx.clienteInteracao.findFirst.mockResolvedValue(antes);

    await expect(
      service.atualizar(empresaId, 'interacao-a', usuarioAutorId, {
        versaoRegistro: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.clienteInteracao.updateMany).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });

  it('propaga falha de auditoria e não confirma o retorno da alteração', async () => {
    const { service, tx } = contexto();
    tx.clienteInteracao.findFirst.mockResolvedValue(antes);
    tx.auditoriaLog.create.mockRejectedValue(new Error('falha de auditoria'));

    await expect(
      service.atualizar(empresaId, 'interacao-a', usuarioAutorId, {
        versaoRegistro: 0,
      }),
    ).rejects.toThrow('falha de auditoria');
    expect(tx.clienteInteracao.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.clienteInteracao.findFirstOrThrow).toHaveBeenCalledTimes(1);
  });

  describe('DTOs', () => {
    it.each(['dataInicial', 'dataFinal'] as const)(
      'aceita %s válida',
      async (campo) => {
        const dtoFiltro = Object.assign(new FiltroClienteInteracoesDto(), {
          [campo]: '2026-09-19T12:00:00.000Z',
        });
        await expect(validate(dtoFiltro)).resolves.toHaveLength(0);
      },
    );

    it.each(['dataInicial', 'dataFinal'] as const)(
      'rejeita %s inválida',
      async (campo) => {
        const dtoFiltro = Object.assign(new FiltroClienteInteracoesDto(), {
          [campo]: 'data-inválida',
        });
        expect(await validate(dtoFiltro)).not.toHaveLength(0);
      },
    );

    it.each([
      'clienteId',
      'oportunidadeId',
      'agendaEventoId',
      'responsavelId',
    ] as const)('rejeita %s inválido no filtro', async (campo) => {
      const dtoFiltro = Object.assign(new FiltroClienteInteracoesDto(), {
        [campo]: 'nao-e-uuid',
      });
      expect(await validate(dtoFiltro)).not.toHaveLength(0);
    });

    it.each([
      'clienteId',
      'oportunidadeId',
      'agendaEventoId',
      'responsavelId',
    ] as const)('rejeita %s inválido na criação', async (campo) => {
      const dtoCriacao = Object.assign(new CriarClienteInteracaoDto(), {
        clienteId: uuid,
        oportunidadeId: uuid,
        agendaEventoId: uuid,
        responsavelId: uuid,
        tipo: TipoInteracaoCRM.NOTA,
        descricao: 'Interação válida',
        dataHora: '2026-09-19T12:00:00.000Z',
        [campo]: 'nao-e-uuid',
      });
      expect(await validate(dtoCriacao)).not.toHaveLength(0);
    });

    it.each([
      'clienteId',
      'oportunidadeId',
      'agendaEventoId',
      'responsavelId',
    ] as const)('rejeita %s inválido na atualização', async (campo) => {
      const dtoAtualizacao = Object.assign(new AtualizarClienteInteracaoDto(), {
        versaoRegistro: 0,
        [campo]: 'nao-e-uuid',
      });
      expect(await validate(dtoAtualizacao)).not.toHaveLength(0);
    });

    it.each(['clienteId', 'oportunidadeId', 'agendaEventoId'] as const)(
      'aceita %s nulo na atualização',
      async (campo) => {
        const dtoAtualizacao = Object.assign(
          new AtualizarClienteInteracaoDto(),
          {
            versaoRegistro: 0,
            [campo]: null,
          },
        );
        await expect(validate(dtoAtualizacao)).resolves.toHaveLength(0);
      },
    );
  });
});
