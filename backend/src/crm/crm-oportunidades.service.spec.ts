/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Mocks do Jest expõem valores como any. */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Prisma, TipoEtapaCRM } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CrmOportunidadesService } from './crm-oportunidades.service';
import { AtualizarCrmOportunidadeDto } from './dto/atualizar-crm-oportunidade.dto';
import { CriarCrmOportunidadeDto } from './dto/criar-crm-oportunidade.dto';
import { FiltroCrmOportunidadesDto } from './dto/filtro-crm-oportunidades.dto';

describe('CrmOportunidadesService', () => {
  const empresaId = 'empresa-a';
  const usuarioId = 'usuario-a';
  const ids = {
    cliente: '11111111-1111-4111-8111-111111111111',
    etapa: '22222222-2222-4222-8222-222222222222',
    responsavel: '33333333-3333-4333-8333-333333333333',
    oportunidade: '44444444-4444-4444-8444-444444444444',
  };
  const oportunidade = {
    id: ids.oportunidade,
    empresaId,
    clienteId: ids.cliente,
    etapaId: ids.etapa,
    responsavelId: ids.responsavel,
    titulo: 'Renovação anual',
    descricao: null,
    valorEstimado: new Prisma.Decimal('100.00'),
    previsaoFechamento: null,
    dataFechamento: null,
    motivoPerda: null,
    vendaId: null,
    versaoRegistro: 0,
    createdAt: new Date('2026-09-19T10:00:00.000Z'),
    updatedAt: new Date('2026-09-19T10:00:00.000Z'),
  };

  const criarDados: CriarCrmOportunidadeDto = {
    clienteId: ids.cliente,
    etapaId: ids.etapa,
    responsavelId: ids.responsavel,
    titulo: 'Renovação anual',
    valorEstimado: 100,
  };

  function contexto() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      cliente: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: ids.cliente, ativo: true }),
      },
      crmEtapa: {
        findFirst: jest.fn().mockResolvedValue({
          id: ids.etapa,
          ativo: true,
          tipo: TipoEtapaCRM.ABERTA,
        }),
      },
      usuario: {
        findFirst: jest.fn().mockResolvedValue({ id: ids.responsavel }),
        findMany: jest.fn(),
      },
      crmOportunidade: {
        create: jest.fn().mockResolvedValue(oportunidade),
        findFirst: jest.fn().mockResolvedValue(oportunidade),
        findFirstOrThrow: jest.fn().mockResolvedValue(oportunidade),
        findMany: jest.fn().mockResolvedValue([oportunidade]),
        count: jest.fn().mockResolvedValue(1),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      venda: {
        findFirst: jest.fn().mockResolvedValue({
          id: '55555555-5555-4555-8555-555555555555',
          empresaId,
          clienteId: ids.cliente,
        }),
      },
      crmOportunidadeHistorico: {
        create: jest.fn().mockResolvedValue({ id: 'historico-a' }),
      },
      auditoriaLog: {
        create: jest.fn().mockResolvedValue({ id: 'auditoria-a' }),
      },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn(
        async (
          operacao:
            | ((transacao: typeof tx) => Promise<unknown>)
            | Promise<unknown>[],
        ) => {
          if (typeof operacao === 'function') return await operacao(tx);
          return Promise.all(operacao);
        },
      ),
    };
    return {
      prisma,
      tx,
      service: new CrmOportunidadesService(prisma as unknown as PrismaService),
    };
  }

  function erroPrisma(code: string, meta?: Record<string, unknown>) {
    return new Prisma.PrismaClientKnownRequestError('conflito', {
      code,
      clientVersion: 'test',
      meta,
    });
  }

  describe('criar', () => {
    it('cria tenant-safe com valores comerciais iniciais, histórico e auditoria', async () => {
      const { service, tx } = contexto();

      await expect(
        service.criar(empresaId, usuarioId, criarDados),
      ).resolves.toEqual(oportunidade);

      expect(tx.crmOportunidade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId,
            clienteId: ids.cliente,
            etapaId: ids.etapa,
            responsavelId: ids.responsavel,
            dataFechamento: null,
            motivoPerda: null,
            vendaId: null,
            versaoRegistro: 0,
          }),
        }),
      );
      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId,
          oportunidadeId: ids.oportunidade,
          etapaAnteriorId: null,
          etapaNovaId: ids.etapa,
          descricao: 'Oportunidade criada.',
          usuarioId,
        }),
      });
      expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId,
          usuarioId,
          entidade: AuditoriaEntidade.CRM_OPORTUNIDADE,
          entidadeId: ids.oportunidade,
          acao: AuditoriaAcao.CRIAR_OPORTUNIDADE_CRM,
          dadosAntigos: undefined,
        }),
      });
    });

    it.each([
      ['cliente inexistente', 'cliente', null, NotFoundException],
      [
        'cliente inativo',
        'cliente',
        { id: ids.cliente, ativo: false },
        BadRequestException,
      ],
      ['etapa inexistente', 'etapa', null, NotFoundException],
      [
        'etapa inativa',
        'etapa',
        { id: ids.etapa, ativo: false, tipo: TipoEtapaCRM.ABERTA },
        BadRequestException,
      ],
      [
        'etapa GANHA',
        'etapa',
        { id: ids.etapa, ativo: true, tipo: TipoEtapaCRM.GANHA },
        BadRequestException,
      ],
      [
        'etapa PERDIDA',
        'etapa',
        { id: ids.etapa, ativo: true, tipo: TipoEtapaCRM.PERDIDA },
        BadRequestException,
      ],
      [
        'responsável inexistente ou outro tenant',
        'responsavel',
        null,
        BadRequestException,
      ],
      [
        'responsável inativo ou SUPER_ADMIN',
        'responsavel',
        null,
        BadRequestException,
      ],
    ] as const)('rejeita %s', async (_caso, alvo, retorno, excecao) => {
      const { service, tx } = contexto();
      if (alvo === 'cliente') tx.cliente.findFirst.mockResolvedValue(retorno);
      if (alvo === 'etapa') tx.crmEtapa.findFirst.mockResolvedValue(retorno);
      if (alvo === 'responsavel')
        tx.usuario.findFirst.mockResolvedValue(retorno);

      await expect(
        service.criar(empresaId, usuarioId, criarDados),
      ).rejects.toBeInstanceOf(excecao);
      expect(tx.crmOportunidade.create).not.toHaveBeenCalled();
    });

    it.each(['ADMIN_SISTEMA', 'SUPER_ADMIN'] as const)(
      'rejeita tipo de responsável não elegível (%s)',
      async () => {
        const { service, tx } = contexto();
        tx.usuario.findFirst.mockResolvedValue(null);

        await expect(
          service.criar(empresaId, usuarioId, criarDados),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(tx.usuario.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              empresaId,
              ativo: true,
              tipo: { in: ['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] },
            }),
          }),
        );
      },
    );

    it.each(['crmOportunidadeHistorico', 'auditoriaLog'] as const)(
      'propaga falha de %s e não confirma a transação',
      async (destino) => {
        const { service, tx } = contexto();
        tx[destino].create.mockRejectedValue(
          new Error('falha de persistência'),
        );

        await expect(
          service.criar(empresaId, usuarioId, criarDados),
        ).rejects.toThrow('falha de persistência');
      },
    );
  });

  describe('listar e buscarPorId', () => {
    it('pagina, ordena e aplica filtros tenant-safe', async () => {
      const { service, tx } = contexto();
      await service.listar(empresaId, {
        clienteId: ids.cliente,
        etapaId: ids.etapa,
        responsavelId: ids.responsavel,
        tipoEtapa: TipoEtapaCRM.ABERTA,
        previsaoFechamentoInicial: '2026-09-01T00:00:00.000Z',
        previsaoFechamentoFinal: '2026-09-30T23:59:59.000Z',
        page: 2,
        limit: 20,
      });

      expect(tx.crmOportunidade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId,
            clienteId: ids.cliente,
            etapaId: ids.etapa,
            responsavelId: ids.responsavel,
            etapa: { is: { empresaId, tipo: TipoEtapaCRM.ABERTA } },
            previsaoFechamento: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: 20,
          take: 20,
        }),
      );
    });

    it('mantém o detalhe tenant-safe e retorna 404 para outro tenant', async () => {
      const { service, tx } = contexto();
      tx.crmOportunidade.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.buscarPorId('empresa-b', ids.oportunidade),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.crmOportunidade.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ids.oportunidade, empresaId: 'empresa-b' },
        }),
      );
    });
  });

  describe('atualizar', () => {
    const patch: AtualizarCrmOportunidadeDto = {
      titulo: 'Novo título',
      versaoRegistro: 0,
    };

    it('bloqueia tenant-scoped, atualiza por versão, audita antes/depois e incrementa versão', async () => {
      const { service, tx } = contexto();
      const depois = {
        ...oportunidade,
        titulo: 'Novo título',
        versaoRegistro: 1,
      };
      tx.crmOportunidade.findFirstOrThrow
        .mockResolvedValueOnce(depois)
        .mockResolvedValueOnce(depois);

      await service.atualizar(empresaId, ids.oportunidade, usuarioId, patch);

      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(tx.crmOportunidade.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ids.oportunidade, empresaId, versaoRegistro: 0 },
          data: expect.objectContaining({
            versaoRegistro: { increment: 1 },
            titulo: 'Novo título',
          }),
        }),
      );
      expect(tx.auditoriaLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            acao: AuditoriaAcao.ATUALIZAR_OPORTUNIDADE_CRM,
            dadosAntigos: expect.anything(),
            dadosNovos: expect.anything(),
          }),
        }),
      );
    });

    it('não faz retry para versão stale', async () => {
      const { service, prisma } = contexto();
      await expect(
        service.atualizar(empresaId, ids.oportunidade, usuarioId, {
          versaoRegistro: 9,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('revalida responsável dentro da transação e registra histórico comercial', async () => {
      const { service, tx } = contexto();
      const responsavelNovo = '55555555-5555-4555-8555-555555555555';
      tx.crmOportunidade.findFirstOrThrow.mockResolvedValue({
        ...oportunidade,
        responsavelId: responsavelNovo,
        versaoRegistro: 1,
      });

      await service.atualizar(empresaId, ids.oportunidade, usuarioId, {
        responsavelId: responsavelNovo,
        versaoRegistro: 0,
      });
      expect(tx.usuario.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: responsavelNovo, empresaId }),
        }),
      );
      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            descricao: 'Responsável da oportunidade alterado.',
          }),
        }),
      );
    });

    it('registra histórico para alteração relevante de valor', async () => {
      const { service, tx } = contexto();
      tx.crmOportunidade.findFirstOrThrow.mockResolvedValue({
        ...oportunidade,
        valorEstimado: new Prisma.Decimal(200),
        versaoRegistro: 1,
      });

      await service.atualizar(empresaId, ids.oportunidade, usuarioId, {
        valorEstimado: 200,
        versaoRegistro: 0,
      });
      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            descricao: 'Valor estimado da oportunidade alterado.',
          }),
        }),
      );
    });

    it.each(['crmOportunidadeHistorico', 'auditoriaLog'] as const)(
      'propaga falha de %s no PATCH',
      async (destino) => {
        const { service, tx } = contexto();
        tx[destino].create.mockRejectedValue(
          new Error('falha de persistência'),
        );

        await expect(
          service.atualizar(empresaId, ids.oportunidade, usuarioId, {
            responsavelId: '55555555-5555-4555-8555-555555555555',
            versaoRegistro: 0,
          }),
        ).rejects.toThrow('falha de persistência');
      },
    );

    it.each([
      ['P2034', undefined],
      ['P2010', { code: '40001' }],
      ['P2010', { code: '40P01' }],
    ] as const)('repete conflito transacional %s', async (code, meta) => {
      const { service, prisma, tx } = contexto();
      prisma.$transaction
        .mockRejectedValueOnce(erroPrisma(code, meta))
        .mockImplementation((operacao) =>
          typeof operacao === 'function' ? operacao(tx) : Promise.all(operacao),
        );

      await expect(
        service.atualizar(empresaId, ids.oportunidade, usuarioId, patch),
      ).resolves.toEqual(oportunidade);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('limita retry concorrente a três tentativas', async () => {
      const { service, prisma } = contexto();
      prisma.$transaction.mockRejectedValue(erroPrisma('P2034'));

      await expect(
        service.atualizar(empresaId, ids.oportunidade, usuarioId, patch),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('DTOs', () => {
    it.each([
      [{ ...criarDados, clienteId: 'inválido' }],
      [{ ...criarDados, titulo: '   ' }],
      [{ ...criarDados, valorEstimado: -1 }],
      [{ ...criarDados, previsaoFechamento: 'data-inválida' }],
    ])('rejeita DTO de criação inválido', async (dados) => {
      expect(
        await validate(plainToInstance(CriarCrmOportunidadeDto, dados)),
      ).not.toHaveLength(0);
    });

    it.each([[{ tipoEtapa: 'INVALIDA' }], [{ page: 0 }], [{ limit: 101 }]])(
      'rejeita filtros inválidos',
      async (dados) => {
        expect(
          await validate(plainToInstance(FiltroCrmOportunidadesDto, dados)),
        ).not.toHaveLength(0);
      },
    );

    it.each([
      [{ versaoRegistro: -1 }],
      [{ versaoRegistro: 1.5 }],
      [{ versaoRegistro: 0, responsavelId: 'inválido' }],
    ])('rejeita PATCH inválido', async (dados) => {
      expect(
        await validate(plainToInstance(AtualizarCrmOportunidadeDto, dados)),
      ).not.toHaveLength(0);
    });

    it('rejeita campos proibidos do PATCH pelo ValidationPipe global', async () => {
      const pipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      await expect(
        pipe.transform(
          { etapaId: ids.etapa, versaoRegistro: 0 },
          { type: 'body', metatype: AtualizarCrmOportunidadeDto },
        ),
      ).rejects.toBeDefined();
    });
  });
  describe('máquina de estados 2C', () => {
    const destino = '55555555-5555-4555-8555-555555555555';
    function movimentar(
      tipo: TipoEtapaCRM,
      dados: object = { etapaId: destino, versaoRegistro: 0 },
    ) {
      const { service, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.ABERTA })
        .mockResolvedValueOnce({ id: destino, tipo, ativo: true });
      return {
        tx,
        resultado: service.movimentar(
          empresaId,
          ids.oportunidade,
          usuarioId,
          dados as never,
        ),
      };
    }
    it.each([
      [TipoEtapaCRM.ABERTA, undefined, null, 'Oportunidade movimentada.'],
      [TipoEtapaCRM.GANHA, undefined, null, 'Oportunidade ganha.'],
      [TipoEtapaCRM.PERDIDA, ' Motivo ', 'Motivo', 'Oportunidade perdida.'],
    ] as const)(
      'movimenta ABERTA para %s preservando venda e auditando',
      async (tipo, motivo, esperado, descricaoHistorico) => {
        const { tx, resultado } = movimentar(tipo, {
          etapaId: destino,
          versaoRegistro: 0,
          ...(motivo === undefined ? {} : { motivoPerda: motivo.trim() }),
        });
        await expect(resultado).resolves.toEqual(oportunidade);
        expect(tx.crmOportunidade.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: ids.oportunidade, empresaId, versaoRegistro: 0 },
            data: expect.objectContaining({
              etapaId: destino,
              motivoPerda: esperado,
              versaoRegistro: { increment: 1 },
            }),
          }),
        );

        expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledTimes(1);
        expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              empresaId,
              oportunidadeId: ids.oportunidade,
              etapaAnteriorId: oportunidade.etapaId,
              etapaNovaId: destino,
              usuarioId,
              descricao: descricaoHistorico,
            }),
          }),
        );

        expect(tx.auditoriaLog.create).toHaveBeenCalledTimes(1);
        expect(tx.auditoriaLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              empresaId,
              usuarioId,
              entidade: AuditoriaEntidade.CRM_OPORTUNIDADE,
              acao: AuditoriaAcao.MOVIMENTAR_OPORTUNIDADE_CRM,
              dadosAntigos: expect.anything(),
              dadosNovos: expect.anything(),
            }),
          }),
        );
      },
    );
    it.each([
      [TipoEtapaCRM.PERDIDA, undefined],
      [TipoEtapaCRM.PERDIDA, ''],
      [TipoEtapaCRM.ABERTA, 'x'],
      [TipoEtapaCRM.GANHA, 'x'],
    ] as const)('rejeita motivo incompatível', async (tipo, motivo) => {
      const { tx, resultado } = movimentar(tipo, {
        etapaId: destino,
        versaoRegistro: 0,
        ...(motivo === undefined ? {} : { motivoPerda: motivo }),
      });
      await expect(resultado).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
    });
    it('reabre GANHA para ABERTA e preserva venda', async () => {
      const { service, tx } = contexto();
      const fechada = {
        ...oportunidade,
        etapaId: 'fechada',
        vendaId: 'venda-a',
        dataFechamento: new Date(),
      };
      tx.crmOportunidade.findFirst.mockResolvedValue(fechada);
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.GANHA })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: true,
        });

      let chamada: Prisma.CrmOportunidadeUpdateManyArgs | undefined;
      tx.crmOportunidade.updateMany.mockImplementation(
        (args: Prisma.CrmOportunidadeUpdateManyArgs) => {
          chamada = args;
          return Promise.resolve({ count: 1 });
        },
      );

      await service.reabrir(empresaId, ids.oportunidade, usuarioId, {
        etapaId: destino,
        versaoRegistro: 0,
      });

      expect(tx.crmOportunidade.updateMany).toHaveBeenCalledTimes(1);
      if (!chamada) throw new Error('updateMany não foi chamado');

      expect(chamada.where).toEqual({
        id: ids.oportunidade,
        empresaId,
        versaoRegistro: 0,
      });
      expect(chamada.data).toEqual(
        expect.objectContaining({
          etapaId: destino,
          dataFechamento: null,
          motivoPerda: null,
          versaoRegistro: { increment: 1 },
        }),
      );
      expect(chamada.data).not.toHaveProperty('vendaId');

      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledTimes(1);
      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId,
            oportunidadeId: ids.oportunidade,
            etapaAnteriorId: 'fechada',
            etapaNovaId: destino,
            usuarioId,
            descricao: 'Oportunidade reaberta.',
          }),
        }),
      );

      expect(tx.auditoriaLog.create).toHaveBeenCalledTimes(1);
      expect(tx.auditoriaLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId,
            usuarioId,
            entidade: AuditoriaEntidade.CRM_OPORTUNIDADE,
            acao: AuditoriaAcao.REABRIR_OPORTUNIDADE_CRM,
            dadosAntigos: expect.anything(),
            dadosNovos: expect.anything(),
          }),
        }),
      );
    });
    it('movimentar deve repetir a transação após conflito P2034', async () => {
      const { service, prisma, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.ABERTA })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: true,
        });
      prisma.$transaction.mockRejectedValueOnce(erroPrisma('P2034'));
      await expect(
        service.movimentar(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).resolves.toEqual(oportunidade);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
    it('movimentar deve repetir a transação após PostgreSQL 40001', async () => {
      const { service, prisma, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.ABERTA })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: true,
        });
      prisma.$transaction.mockRejectedValueOnce(
        erroPrisma('P2010', { code: '40001' }),
      );
      await expect(
        service.movimentar(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).resolves.toEqual(oportunidade);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
    it('movimentar deve repetir a transação após PostgreSQL 40P01', async () => {
      const { service, prisma, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.ABERTA })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: true,
        });
      prisma.$transaction.mockRejectedValueOnce(
        erroPrisma('P2010', { code: '40P01' }),
      );
      await expect(
        service.movimentar(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).resolves.toEqual(oportunidade);
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    });
    it('movimentar deve limitar conflitos transacionais a três tentativas', async () => {
      const { service, prisma } = contexto();
      prisma.$transaction.mockRejectedValue(erroPrisma('P2034'));
      await expect(
        service.movimentar(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });
    it('movimentar não deve repetir a transação para versaoRegistro desatualizada', async () => {
      const { service, prisma, tx } = contexto();
      tx.crmOportunidade.findFirst.mockResolvedValue({
        ...oportunidade,
        versaoRegistro: 3,
      });
      await expect(
        service.movimentar(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
      expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    });
    it('rejeita stale sem retry e count zero', async () => {
      const { service, prisma, tx } = contexto();
      tx.crmOportunidade.findFirst.mockResolvedValue({
        ...oportunidade,
        versaoRegistro: 3,
      });
      await expect(
        service.movimentar(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
    it.each([
      ['movimentar', TipoEtapaCRM.PERDIDA],
      ['reabrir', TipoEtapaCRM.ABERTA],
    ])(
      'rejeita origem incompatível em %s sem efeitos',
      async (operacao, tipo) => {
        const { service, tx } = contexto();
        tx.crmEtapa.findFirst
          .mockResolvedValueOnce({ tipo })
          .mockResolvedValueOnce({
            id: destino,
            tipo: TipoEtapaCRM.ABERTA,
            ativo: true,
          });
        await expect(
          operacao === 'movimentar'
            ? service.movimentar(empresaId, ids.oportunidade, usuarioId, {
                etapaId: destino,
                versaoRegistro: 0,
              })
            : service.reabrir(empresaId, ids.oportunidade, usuarioId, {
                etapaId: destino,
                versaoRegistro: 0,
              }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
        expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
        expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
      },
    );
    it.each([
      ['movimentar', TipoEtapaCRM.ABERTA],
      ['reabrir', TipoEtapaCRM.GANHA],
    ])('rejeita destino inativo em %s', async (operacao, origem) => {
      const { service, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: origem })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: false,
        });
      await expect(
        operacao === 'movimentar'
          ? service.movimentar(empresaId, ids.oportunidade, usuarioId, {
              etapaId: destino,
              versaoRegistro: 0,
            })
          : service.reabrir(empresaId, ids.oportunidade, usuarioId, {
              etapaId: destino,
              versaoRegistro: 0,
            }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
    });
    it.each([TipoEtapaCRM.GANHA, TipoEtapaCRM.PERDIDA])(
      'rejeita destino fechado na reabertura (%s)',
      async (tipo) => {
        const { service, tx } = contexto();
        tx.crmEtapa.findFirst
          .mockResolvedValueOnce({ tipo: TipoEtapaCRM.GANHA })
          .mockResolvedValueOnce({ id: destino, tipo, ativo: true });
        await expect(
          service.reabrir(empresaId, ids.oportunidade, usuarioId, {
            etapaId: destino,
            versaoRegistro: 0,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );
    it.each(['movimentar', 'reabrir'] as const)(
      'rejeita count zero em %s sem histórico/auditoria',
      async (operacao) => {
        const { service, tx } = contexto();
        tx.crmEtapa.findFirst
          .mockResolvedValueOnce({
            tipo:
              operacao === 'movimentar'
                ? TipoEtapaCRM.ABERTA
                : TipoEtapaCRM.GANHA,
          })
          .mockResolvedValueOnce({
            id: destino,
            tipo: TipoEtapaCRM.ABERTA,
            ativo: true,
          });
        tx.crmOportunidade.updateMany.mockResolvedValue({ count: 0 });
        await expect(
          operacao === 'movimentar'
            ? service.movimentar(empresaId, ids.oportunidade, usuarioId, {
                etapaId: destino,
                versaoRegistro: 0,
              })
            : service.reabrir(empresaId, ids.oportunidade, usuarioId, {
                etapaId: destino,
                versaoRegistro: 0,
              }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
        expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
      },
    );
    it.each(['crmOportunidadeHistorico', 'auditoriaLog'] as const)(
      'propaga falha transacional de %s em movimentar/reabrir',
      async (destinoFalha) => {
        for (const operacao of ['movimentar', 'reabrir'] as const) {
          const { service, tx } = contexto();
          tx.crmEtapa.findFirst
            .mockResolvedValueOnce({
              tipo:
                operacao === 'movimentar'
                  ? TipoEtapaCRM.ABERTA
                  : TipoEtapaCRM.GANHA,
            })
            .mockResolvedValueOnce({
              id: destino,
              tipo: TipoEtapaCRM.ABERTA,
              ativo: true,
            });
          tx[destinoFalha].create.mockRejectedValue(new Error('falha'));
          await expect(
            operacao === 'movimentar'
              ? service.movimentar(empresaId, ids.oportunidade, usuarioId, {
                  etapaId: destino,
                  versaoRegistro: 0,
                })
              : service.reabrir(empresaId, ids.oportunidade, usuarioId, {
                  etapaId: destino,
                  versaoRegistro: 0,
                }),
          ).rejects.toThrow('falha');
        }
      },
    );
    it('movimentar deve retornar 404 quando a etapa destino não pertence ao tenant', async () => {
      const { service, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.ABERTA })
        .mockResolvedValueOnce(null);
      await expect(
        service.movimentar(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.crmEtapa.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { id: destino, empresaId } }),
      );
      expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
      expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    });
    it('reabrir deve retornar 404 quando a etapa destino não pertence ao tenant', async () => {
      const { service, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.GANHA })
        .mockResolvedValueOnce(null);
      await expect(
        service.reabrir(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 0,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.crmEtapa.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { id: destino, empresaId } }),
      );
      expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
      expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    });
    it('movimentar deve bloquear oportunidade por id e empresaId antes do update', async () => {
      const { service, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.ABERTA })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: true,
        });
      await service.movimentar(empresaId, ids.oportunidade, usuarioId, {
        etapaId: destino,
        versaoRegistro: 0,
      });
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.crmOportunidade.updateMany.mock.invocationCallOrder[0],
      );
    });
    it('reabrir deve bloquear oportunidade por id e empresaId antes do update', async () => {
      const { service, tx } = contexto();
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.GANHA })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: true,
        });
      await service.reabrir(empresaId, ids.oportunidade, usuarioId, {
        etapaId: destino,
        versaoRegistro: 0,
      });
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.crmOportunidade.updateMany.mock.invocationCallOrder[0],
      );
    });
    it('reabrir deve reabrir oportunidade PERDIDA para ABERTA preservando vendaId', async () => {
      const { service, tx } = contexto();
      const perdida = {
        ...oportunidade,
        etapaId: '66666666-6666-4666-8666-666666666666',
        dataFechamento: new Date(),
        motivoPerda: 'Sem orçamento',
        vendaId: '77777777-7777-4777-8777-777777777777',
        versaoRegistro: 4,
      };
      const reaberta = {
        ...perdida,
        etapaId: destino,
        dataFechamento: null,
        motivoPerda: null,
        versaoRegistro: 5,
      };
      tx.crmOportunidade.findFirst.mockResolvedValue(perdida);
      tx.crmOportunidade.findFirstOrThrow.mockResolvedValue(reaberta);
      tx.crmEtapa.findFirst
        .mockResolvedValueOnce({ tipo: TipoEtapaCRM.PERDIDA })
        .mockResolvedValueOnce({
          id: destino,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: true,
        });
      let chamada: Prisma.CrmOportunidadeUpdateManyArgs | undefined;
      tx.crmOportunidade.updateMany.mockImplementation(
        (args: Prisma.CrmOportunidadeUpdateManyArgs) => {
          chamada = args;
          return Promise.resolve({ count: 1 });
        },
      );

      await expect(
        service.reabrir(empresaId, ids.oportunidade, usuarioId, {
          etapaId: destino,
          versaoRegistro: 4,
        }),
      ).resolves.toEqual(reaberta);
      expect(tx.crmOportunidade.updateMany).toHaveBeenCalledTimes(1);
      if (!chamada) throw new Error('updateMany não foi chamado');
      expect(chamada.where).toEqual({
        id: ids.oportunidade,
        empresaId,
        versaoRegistro: 4,
      });
      expect(chamada.data).toEqual(
        expect.objectContaining({
          etapaId: destino,
          dataFechamento: null,
          motivoPerda: null,
          versaoRegistro: { increment: 1 },
        }),
      );
      expect(chamada.data).not.toHaveProperty('vendaId');
      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledTimes(1);
      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId,
            oportunidadeId: ids.oportunidade,
            etapaAnteriorId: perdida.etapaId,
            etapaNovaId: destino,
            usuarioId,
            descricao: 'Oportunidade reaberta.',
          }),
        }),
      );
      expect(tx.auditoriaLog.create).toHaveBeenCalledTimes(1);
      expect(tx.auditoriaLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entidade: AuditoriaEntidade.CRM_OPORTUNIDADE,
            acao: AuditoriaAcao.REABRIR_OPORTUNIDADE_CRM,
            usuarioId,
            dadosAntigos: expect.anything(),
            dadosNovos: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('vincularVenda', () => {
    const vendaId = '55555555-5555-4555-8555-555555555555';
    const dados = { vendaId, versaoRegistro: 0 };

    function prepararVinculo(tx: ReturnType<typeof contexto>['tx']) {
      const depois = { ...oportunidade, vendaId, versaoRegistro: 1 };
      tx.crmEtapa.findFirst.mockResolvedValue({
        id: ids.etapa,
        tipo: TipoEtapaCRM.GANHA,
      });
      tx.venda.findFirst.mockResolvedValue({
        id: vendaId,
        empresaId,
        clienteId: ids.cliente,
      });
      tx.crmOportunidade.findFirst
        .mockResolvedValueOnce(oportunidade)
        .mockResolvedValueOnce(null);
      tx.crmOportunidade.findFirstOrThrow.mockResolvedValue(depois);
      return depois;
    }

    it('vincula venda da mesma empresa e cliente com histórico e auditoria', async () => {
      const { service, tx } = contexto();
      const depois = prepararVinculo(tx);

      await expect(
        service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).resolves.toEqual(depois);

      expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
      const [lockOportunidade, lockVenda] = tx.$queryRaw.mock.calls as [
        [readonly string[], string, string],
        [readonly string[], string, string],
      ];
      expect(lockOportunidade[0]).toEqual(
        expect.arrayContaining([expect.stringContaining('FOR UPDATE')]),
      );
      expect(lockOportunidade).toEqual(
        expect.arrayContaining([ids.oportunidade, empresaId]),
      );
      expect(lockVenda[0]).toEqual(
        expect.arrayContaining([expect.stringContaining('FOR UPDATE')]),
      );
      expect(lockVenda).toEqual(expect.arrayContaining([vendaId, empresaId]));
      expect(tx.crmOportunidade.updateMany).toHaveBeenCalledWith({
        where: { id: ids.oportunidade, empresaId, versaoRegistro: 0 },
        data: { vendaId, versaoRegistro: { increment: 1 } },
      });
      expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId,
          oportunidadeId: ids.oportunidade,
          etapaAnteriorId: ids.etapa,
          etapaNovaId: ids.etapa,
          descricao: 'Venda vinculada à oportunidade.',
          usuarioId,
        }),
      });
      expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entidade: AuditoriaEntidade.CRM_OPORTUNIDADE,
          acao: AuditoriaAcao.VINCULAR_VENDA_OPORTUNIDADE_CRM,
          dadosAntigos: expect.anything(),
          dadosNovos: expect.anything(),
          empresaId,
          usuarioId,
        }),
      });
    });

    it.each([
      [
        'oportunidade inexistente',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.crmOportunidade.findFirst.mockResolvedValueOnce(null),
        NotFoundException,
      ],
      [
        'venda inexistente',
        (tx: ReturnType<typeof contexto>['tx']) => {
          prepararVinculo(tx);
          tx.venda.findFirst.mockResolvedValueOnce(null);
        },
        NotFoundException,
      ],
      [
        'etapa não ganha',
        (tx: ReturnType<typeof contexto>['tx']) => {
          prepararVinculo(tx);
          tx.crmEtapa.findFirst.mockResolvedValueOnce({
            id: ids.etapa,
            tipo: TipoEtapaCRM.ABERTA,
          });
        },
        BadRequestException,
      ],
      [
        'venda de cliente diferente',
        (tx: ReturnType<typeof contexto>['tx']) => {
          prepararVinculo(tx);
          tx.venda.findFirst.mockResolvedValueOnce({
            id: vendaId,
            empresaId,
            clienteId: 'cliente-outro',
          });
        },
        BadRequestException,
      ],
    ] as const)(
      'rejeita %s sem persistir vínculo',
      async (_nome, preparar, erro) => {
        const { service, tx } = contexto();
        preparar(tx);

        await expect(
          service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
        ).rejects.toBeInstanceOf(erro);
        expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
        expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
        expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        'oportunidade já vinculada',
        () => ({ ...oportunidade, vendaId: 'venda-existente' }),
      ],
      ['venda já vinculada a outra oportunidade', () => oportunidade],
    ] as const)(
      'rejeita conflito quando %s',
      async (nome, oportunidadeAtual) => {
        const { service, tx } = contexto();
        const atual = oportunidadeAtual();
        tx.crmEtapa.findFirst.mockResolvedValue({
          id: ids.etapa,
          tipo: TipoEtapaCRM.GANHA,
        });
        tx.crmOportunidade.findFirst
          .mockResolvedValueOnce(atual)
          .mockResolvedValueOnce(
            nome === 'venda já vinculada a outra oportunidade'
              ? { id: 'outra' }
              : null,
          );

        await expect(
          service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
      },
    );

    it('retorna conflito para versão desatualizada sem retry', async () => {
      const { service, tx, prisma } = contexto();
      tx.crmOportunidade.findFirst.mockResolvedValueOnce({
        ...oportunidade,
        versaoRegistro: 1,
      });
      await expect(
        service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
    });

    it('retorna conflito quando update concorrente não altera registro', async () => {
      const { service, tx } = contexto();
      prepararVinculo(tx);
      tx.crmOportunidade.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    });

    it.each([
      ['P2034', erroPrisma('P2034')],
      ['40001', erroPrisma('P2010', { code: '40001' })],
      ['40P01', erroPrisma('P2010', { code: '40P01' })],
    ])(
      'repete vínculo após conflito transacional %s',
      async (_codigo, erro) => {
        const { service, tx, prisma } = contexto();
        prepararVinculo(tx);
        prisma.$transaction
          .mockRejectedValueOnce(erro)
          .mockImplementationOnce(
            async (operacao: (transacao: typeof tx) => Promise<unknown>) =>
              operacao(tx),
          );
        await expect(
          service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
        ).resolves.toBeDefined();
        expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      },
    );

    it('limita conflitos transacionais do vínculo a três tentativas', async () => {
      const { service, prisma } = contexto();
      prisma.$transaction.mockRejectedValue(erroPrisma('P2034'));
      await expect(
        service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it.each([
      [
        'histórico',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.crmOportunidadeHistorico.create.mockRejectedValueOnce(
            new Error('falha'),
          ),
      ],
      [
        'auditoria',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.auditoriaLog.create.mockRejectedValueOnce(new Error('falha')),
      ],
    ] as const)('propaga falha de %s na transação', async (_nome, falhar) => {
      const { service, tx } = contexto();
      prepararVinculo(tx);
      falhar(tx);
      await expect(
        service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).rejects.toThrow('falha');
    });

    it.each(['P2002', 'P2003'])(
      'converte constraint concorrente %s do vínculo em conflito de negócio',
      async (codigo) => {
        const { service, tx } = contexto();
        prepararVinculo(tx);
        tx.crmOportunidade.updateMany.mockRejectedValue(erroPrisma(codigo));
        await expect(
          service.vincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
        ).rejects.toBeInstanceOf(ConflictException);
      },
    );
  });

  describe('desvincularVenda', () => {
    const vendaId = '55555555-5555-4555-8555-555555555555';
    const dados = { versaoRegistro: 2 };

    function prepararDesvinculo(
      tx: ReturnType<typeof contexto>['tx'],
      etapaId = ids.etapa,
    ) {
      const antes = { ...oportunidade, etapaId, vendaId, versaoRegistro: 2 };
      const depois = { ...antes, vendaId: null, versaoRegistro: 3 };
      tx.crmOportunidade.findFirst.mockResolvedValueOnce(antes);
      tx.crmOportunidade.findFirstOrThrow.mockResolvedValue(depois);
      return { antes, depois };
    }

    it.each([
      ['GANHA', 'etapa-ganha'],
      ['ABERTA reaberta', 'etapa-aberta'],
    ] as const)(
      'desvincula Venda de oportunidade %s sem alterar estado comercial',
      async (_estado, etapaId) => {
        const { service, tx } = contexto();
        const { antes, depois } = prepararDesvinculo(tx, etapaId);

        await expect(
          service.desvincularVenda(
            empresaId,
            ids.oportunidade,
            usuarioId,
            dados,
          ),
        ).resolves.toEqual(depois);

        expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
        const [lock] = tx.$queryRaw.mock.calls as [
          [readonly string[], string, string],
        ];
        expect(lock[0]).toEqual(
          expect.arrayContaining([expect.stringContaining('FOR UPDATE')]),
        );
        expect(lock).toEqual(
          expect.arrayContaining([ids.oportunidade, empresaId]),
        );
        expect(tx.crmOportunidade.updateMany).toHaveBeenCalledWith({
          where: { id: ids.oportunidade, empresaId, versaoRegistro: 2 },
          data: { vendaId: null, versaoRegistro: { increment: 1 } },
        });
        expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledTimes(1);
        expect(tx.crmOportunidadeHistorico.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            empresaId,
            oportunidadeId: ids.oportunidade,
            etapaAnteriorId: etapaId,
            etapaNovaId: etapaId,
            descricao: 'Venda desvinculada da oportunidade.',
            usuarioId,
          }),
        });
        expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            entidade: AuditoriaEntidade.CRM_OPORTUNIDADE,
            acao: AuditoriaAcao.DESVINCULAR_VENDA_OPORTUNIDADE_CRM,
            dadosAntigos: expect.anything(),
            dadosNovos: expect.anything(),
          }),
        });
        expect(antes.etapaId).toBe(depois.etapaId);
        expect(antes.dataFechamento).toBe(depois.dataFechamento);
        expect(antes.motivoPerda).toBe(depois.motivoPerda);
        expect(tx.venda.findFirst).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        'oportunidade inexistente',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.crmOportunidade.findFirst.mockResolvedValueOnce(null),
        NotFoundException,
      ],
      [
        'oportunidade sem venda',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.crmOportunidade.findFirst.mockResolvedValueOnce(oportunidade),
        ConflictException,
      ],
      [
        'versão desatualizada',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.crmOportunidade.findFirst.mockResolvedValueOnce({
            ...oportunidade,
            vendaId,
            versaoRegistro: 3,
          }),
        ConflictException,
      ],
    ] as const)(
      'rejeita %s sem persistir desvinculação',
      async (_nome, preparar, erro) => {
        const { service, tx, prisma } = contexto();
        preparar(tx);
        await expect(
          service.desvincularVenda(
            empresaId,
            ids.oportunidade,
            usuarioId,
            dados,
          ),
        ).rejects.toBeInstanceOf(erro);
        expect(tx.crmOportunidade.updateMany).not.toHaveBeenCalled();
        expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
        expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
        if (_nome === 'versão desatualizada')
          expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      },
    );

    it('retorna conflito quando update concorrente não altera registro', async () => {
      const { service, tx } = contexto();
      prepararDesvinculo(tx);
      tx.crmOportunidade.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.desvincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.crmOportunidadeHistorico.create).not.toHaveBeenCalled();
      expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    });

    it.each([
      ['P2034', erroPrisma('P2034')],
      ['40001', erroPrisma('P2010', { code: '40001' })],
      ['40P01', erroPrisma('P2010', { code: '40P01' })],
    ])(
      'repete desvinculação após conflito transacional %s',
      async (_codigo, erro) => {
        const { service, tx, prisma } = contexto();
        prepararDesvinculo(tx);
        prisma.$transaction
          .mockRejectedValueOnce(erro)
          .mockImplementationOnce(
            async (operacao: (transacao: typeof tx) => Promise<unknown>) =>
              operacao(tx),
          );
        await expect(
          service.desvincularVenda(
            empresaId,
            ids.oportunidade,
            usuarioId,
            dados,
          ),
        ).resolves.toBeDefined();
        expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      },
    );

    it('limita conflitos transacionais da desvinculação a três tentativas', async () => {
      const { service, prisma } = contexto();
      prisma.$transaction.mockRejectedValue(erroPrisma('P2034'));
      await expect(
        service.desvincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it.each([
      [
        'histórico',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.crmOportunidadeHistorico.create.mockRejectedValueOnce(
            new Error('falha'),
          ),
      ],
      [
        'auditoria',
        (tx: ReturnType<typeof contexto>['tx']) =>
          tx.auditoriaLog.create.mockRejectedValueOnce(new Error('falha')),
      ],
    ] as const)('propaga falha de %s na transação', async (_nome, falhar) => {
      const { service, tx } = contexto();
      prepararDesvinculo(tx);
      falhar(tx);
      await expect(
        service.desvincularVenda(empresaId, ids.oportunidade, usuarioId, dados),
      ).rejects.toThrow('falha');
    });
  });
  describe('listarResponsaveis', () => {
    it('lista somente responsáveis CRM elegíveis da empresa, sem campos extras', async () => {
      const { service, tx } = contexto();
      const responsaveis = [
        { id: ids.responsavel, nome: 'Ana', email: 'ana.test' },
        {
          id: '55555555-5555-4555-8555-555555555555',
          nome: 'Bruno',
          email: 'bruno.test',
        },
      ];
      tx.usuario.findMany.mockResolvedValue(responsaveis);

      await expect(service.listarResponsaveis(empresaId)).resolves.toEqual(
        responsaveis,
      );

      expect(tx.usuario.findMany).toHaveBeenCalledWith({
        where: {
          empresaId,
          ativo: true,
          tipo: { in: ['ADMIN_EMPRESA', 'USUARIO_EMPRESA'] },
        },
        select: { id: true, nome: true, email: true },
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      });
    });
  });
});
