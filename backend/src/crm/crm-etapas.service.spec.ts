/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Mocks do Jest expõem valores como any. */
import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TipoEtapaCRM } from '@prisma/client';
import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CrmEtapasService } from './crm-etapas.service';
import { AtualizarCrmEtapaDto } from './dto/atualizar-crm-etapa.dto';
import { CriarCrmEtapaDto } from './dto/criar-crm-etapa.dto';
import { FiltroCrmEtapasDto } from './dto/filtro-crm-etapas.dto';

describe('CrmEtapasService', () => {
  const empresaId = 'empresa-a';
  const usuarioId = 'usuario-a';
  const etapa = {
    id: 'etapa-a',
    empresaId,
    nome: 'Qualificação',
    ordem: 10,
    tipo: TipoEtapaCRM.ABERTA,
    ativo: true,
  };

  function contexto() {
    const tx = {
      crmEtapa: {
        create: jest.fn().mockResolvedValue(etapa),
        findFirst: jest.fn().mockResolvedValue(etapa),
        findMany: jest.fn().mockResolvedValue([etapa]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn().mockResolvedValue({ ...etapa, nome: 'Proposta' }),
      },
      auditoriaLog: { create: jest.fn().mockResolvedValue({ id: 'audit-a' }) },
    };
    const prisma = {
      $transaction: jest.fn(
        (arg: ((client: typeof tx) => unknown) | Promise<unknown>[]) =>
          typeof arg === 'function' ? arg(tx) : Promise.all(arg),
      ),
      crmEtapa: {
        findFirst: jest.fn().mockResolvedValue(etapa),
        findMany: jest.fn().mockResolvedValue([etapa]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    return {
      tx,
      prisma,
      service: new CrmEtapasService(prisma as unknown as PrismaService),
    };
  }

  it('cria etapa no tenant e registra auditoria no mesmo tx', async () => {
    const { service, prisma, tx } = contexto();
    await service.criar(empresaId, usuarioId, {
      nome: 'Qualificação',
      ordem: 10,
      tipo: TipoEtapaCRM.ABERTA,
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    expect(tx.crmEtapa.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ empresaId, ativo: undefined }),
    });
    expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        empresaId,
        usuarioId,
        entidade: AuditoriaEntidade.CRM_ETAPA,
        entidadeId: etapa.id,
        acao: AuditoriaAcao.CRIAR_ETAPA_CRM,
        dadosAntigos: undefined,
        dadosNovos: expect.objectContaining({ nome: etapa.nome }),
      }),
    });
  });

  it('propaga falha de auditoria da criação', async () => {
    const { service, tx } = contexto();
    tx.auditoriaLog.create.mockRejectedValue(new Error('falha de auditoria'));
    await expect(
      service.criar(empresaId, usuarioId, {
        nome: 'Qualificação',
        ordem: 10,
        tipo: TipoEtapaCRM.ABERTA,
      }),
    ).rejects.toThrow('falha de auditoria');
    expect(tx.crmEtapa.create).toHaveBeenCalledTimes(1);
  });

  it('busca etapa com filtro de tenant', async () => {
    const { service, prisma } = contexto();
    await service.buscarPorId(empresaId, etapa.id);
    expect(prisma.crmEtapa.findFirst).toHaveBeenCalledWith({
      where: { id: etapa.id, empresaId },
    });
  });

  it.each(['inexistente', 'de outro tenant'])(
    'retorna 404 para etapa %s',
    async () => {
      const { service, prisma } = contexto();
      prisma.crmEtapa.findFirst.mockResolvedValue(null);
      await expect(
        service.buscarPorId(empresaId, etapa.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it.each([
    {
      filtro: { tipo: TipoEtapaCRM.GANHA },
      esperado: { tipo: TipoEtapaCRM.GANHA },
    },
    { filtro: { ativo: true }, esperado: { ativo: true } },
    { filtro: { ativo: false }, esperado: { ativo: false } },
  ])('lista com filtro $filtro', async ({ filtro, esperado }) => {
    const { service, prisma } = contexto();
    await service.listar(empresaId, filtro);
    expect(prisma.crmEtapa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId, ...esperado }),
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
        skip: 0,
        take: 10,
      }),
    );
  });

  it('pagina a listagem com o envelope padrão', async () => {
    const { service, prisma } = contexto();
    const resposta = await service.listar(empresaId, { page: 2, limit: 5 });
    expect(prisma.crmEtapa.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(resposta.meta).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });
  });

  it.each([
    { dados: { nome: 'Proposta' }, campo: 'nome', valor: 'Proposta' },
    { dados: { ordem: 20 }, campo: 'ordem', valor: 20 },
    { dados: { ativo: true }, campo: 'ativo', valor: true },
    { dados: { ativo: false }, campo: 'ativo', valor: false },
  ])(
    'atualiza $campo e audita antes/depois',
    async ({ dados, campo, valor }) => {
      const { service, tx } = contexto();
      tx.crmEtapa.update.mockResolvedValue({ ...etapa, [campo]: valor });
      await service.atualizar(empresaId, etapa.id, usuarioId, dados);
      expect(tx.crmEtapa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId_id: { empresaId, id: etapa.id } },
          data: expect.objectContaining(dados),
        }),
      );
      expect(tx.auditoriaLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          acao: AuditoriaAcao.ATUALIZAR_ETAPA_CRM,
          dadosAntigos: expect.objectContaining({
            [campo]: etapa[campo as keyof typeof etapa],
          }),
          dadosNovos: expect.objectContaining({ [campo]: valor }),
        }),
      });
    },
  );

  it('não atualiza outro tenant', async () => {
    const { service, tx } = contexto();
    tx.crmEtapa.findFirst.mockResolvedValue(null);
    await expect(
      service.atualizar(empresaId, etapa.id, usuarioId, { nome: 'Proposta' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.crmEtapa.update).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
  });

  describe('DTOs', () => {
    it.each([
      { dados: { nome: '   ', ordem: 0, tipo: TipoEtapaCRM.ABERTA } },
      { dados: { nome: 'Aberta', ordem: -1, tipo: TipoEtapaCRM.ABERTA } },
      { dados: { nome: 'Aberta', ordem: 1.5, tipo: TipoEtapaCRM.ABERTA } },
      { dados: { nome: 'Aberta', ordem: 0, tipo: 'INVALIDO' } },
      {
        dados: {
          nome: 'Aberta',
          ordem: 0,
          tipo: TipoEtapaCRM.ABERTA,
          ativo: 'sim',
        },
      },
    ])('rejeita criação inválida', async ({ dados }) => {
      expect(
        await validate(plainToInstance(CriarCrmEtapaDto, dados)),
      ).not.toHaveLength(0);
    });

    it.each([{ page: 0 }, { limit: 0 }, { limit: 101 }])(
      'rejeita paginação inválida',
      async (dados) => {
        expect(
          await validate(plainToInstance(FiltroCrmEtapasDto, dados)),
        ).not.toHaveLength(0);
      },
    );

    it.each([
      ['true', true],
      ['false', false],
      [true, true],
      [false, false],
    ])('converte ativo %p com segurança', async (entrada, esperado) => {
      const dto = plainToInstance(FiltroCrmEtapasDto, { ativo: entrada });
      await expect(validate(dto)).resolves.toHaveLength(0);
      expect(dto.ativo).toBe(esperado);
    });

    it('rejeita valor ativo diferente de true/false', async () => {
      const dto = plainToInstance(FiltroCrmEtapasDto, { ativo: 'sim' });
      expect(await validate(dto)).not.toHaveLength(0);
    });

    it('rejeita tipo no DTO de atualização pelo contrato whitelist', async () => {
      const pipe = new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      await expect(
        pipe.transform(
          { tipo: TipoEtapaCRM.GANHA },
          { type: 'body', metatype: AtualizarCrmEtapaDto },
        ),
      ).rejects.toBeDefined();
    });
  });
});
