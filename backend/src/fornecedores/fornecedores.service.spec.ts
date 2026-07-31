import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { FornecedoresService } from './fornecedores.service';

type PrismaServiceMock = {
  $transaction: jest.Mock;
  fornecedor: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  fornecedorHistorico: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
};

describe('FornecedoresService', () => {
  let service: FornecedoresService;
  let prisma: PrismaServiceMock;

  const usuario: AuthenticatedUser = {
    id: 'usuario-1',
    email: 'usuario@empresa.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'empresa-1',
  };

  const fornecedorBase = {
    id: 'fornecedor-1',
    razaoSocial: 'Fornecedor Antigo',
    nomeFantasia: 'Fantasia',
    documento: '12345678000199',
    inscricaoEstadual: null,
    inscricaoMunicipal: null,
    email: 'antigo@fornecedor.com',
    telefone: '33334444',
    celular: '999998888',
    contato: 'Contato',
    cep: '60000000',
    endereco: 'Rua A',
    numero: '10',
    complemento: null,
    bairro: 'Centro',
    cidade: 'Fortaleza',
    estado: 'CE',
    observacao: null,
    ativo: true,
    empresaId: 'empresa-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const erroP2002 = (target?: unknown) =>
    new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3',
      ...(target === undefined ? {} : { meta: { target } }),
    });

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      fornecedor: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      fornecedorHistorico: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FornecedoresService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FornecedoresService>(FornecedoresService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('cria fornecedor normalizado no tenant explícito e registra histórico', async () => {
    prisma.fornecedor.create.mockResolvedValue(fornecedorBase);
    prisma.fornecedorHistorico.create.mockResolvedValue({ id: 'historico-1' });

    await service.criar(
      'empresa-1',
      {
        razaoSocial: '  Fornecedor Antigo  ',
        nomeFantasia: '  Fantasia  ',
        documento: '12.345.678/0001-99',
        inscricaoEstadual: '  123  ',
        inscricaoMunicipal: '  456  ',
        email: '  CONTATO@FORNECEDOR.COM  ',
        telefone: '  3333-4444  ',
        celular: '  99999-8888  ',
        contato: '  Compras  ',
        cep: '60.000-000',
        endereco: '  Rua A  ',
        numero: '  10  ',
        complemento: '  Sala 1  ',
        bairro: '  Centro  ',
        cidade: '  Fortaleza  ',
        estado: ' ce ',
        observacao: '  Preferencial  ',
      },
      usuario,
    );

    expect(prisma.fornecedor.create).toHaveBeenCalledWith({
      data: {
        razaoSocial: 'Fornecedor Antigo',
        nomeFantasia: 'Fantasia',
        documento: '12345678000199',
        inscricaoEstadual: '123',
        inscricaoMunicipal: '456',
        email: 'contato@fornecedor.com',
        telefone: '3333-4444',
        celular: '99999-8888',
        contato: 'Compras',
        cep: '60000000',
        endereco: 'Rua A',
        numero: '10',
        complemento: 'Sala 1',
        bairro: 'Centro',
        cidade: 'Fortaleza',
        estado: 'CE',
        observacao: 'Preferencial',
        empresaId: 'empresa-1',
      },
    });
    expect(prisma.fornecedorHistorico.create).toHaveBeenCalledWith({
      data: {
        fornecedorId: 'fornecedor-1',
        descricao: 'Fornecedor cadastrado.',
        usuarioId: 'usuario-1',
      },
    });
  });

  it('permite o mesmo documento quando o banco aceita empresas diferentes', async () => {
    prisma.fornecedor.create
      .mockResolvedValueOnce(fornecedorBase)
      .mockResolvedValueOnce({
        ...fornecedorBase,
        id: 'fornecedor-2',
        empresaId: 'empresa-2',
      });
    prisma.fornecedorHistorico.create.mockResolvedValue({});

    await service.criar(
      'empresa-1',
      { razaoSocial: 'Fornecedor 1', documento: '12.345.678/0001-99' },
      usuario,
    );
    await service.criar(
      'empresa-2',
      { razaoSocial: 'Fornecedor 2', documento: '12.345.678/0001-99' },
      { ...usuario, empresaId: 'empresa-2' },
    );

    expect(prisma.fornecedor.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          empresaId: 'empresa-2',
          documento: '12345678000199',
        }) as unknown,
      }),
    );
  });

  it('lista com o mesmo escopo tenant-aware no findMany e no count', async () => {
    prisma.$transaction.mockResolvedValue([[fornecedorBase], 1]);

    await service.listar('empresa-1', {
      page: 2,
      limit: 5,
      search: '12.345.678/0001-99',
      ativo: false,
      cidade: 'Fortaleza',
      estado: 'ce',
    });

    const where = {
      empresaId: 'empresa-1',
      OR: [
        {
          razaoSocial: {
            contains: '12.345.678/0001-99',
            mode: 'insensitive',
          },
        },
        {
          nomeFantasia: {
            contains: '12.345.678/0001-99',
            mode: 'insensitive',
          },
        },
        { documento: { contains: '12345678000199' } },
        {
          email: {
            contains: '12.345.678/0001-99',
            mode: 'insensitive',
          },
        },
        {
          telefone: {
            contains: '12.345.678/0001-99',
            mode: 'insensitive',
          },
        },
        {
          celular: {
            contains: '12.345.678/0001-99',
            mode: 'insensitive',
          },
        },
        {
          cidade: {
            contains: '12.345.678/0001-99',
            mode: 'insensitive',
          },
        },
      ],
      ativo: false,
      cidade: { contains: 'Fortaleza', mode: 'insensitive' },
      estado: 'CE',
    };

    expect(prisma.fornecedor.findMany).toHaveBeenCalledWith({
      where,
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(prisma.fornecedor.count).toHaveBeenCalledWith({ where });
  });

  it('aceita somente campo permitido na ordenação', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.listar('empresa-1', {
      sortBy: 'razaoSocial',
      order: 'asc',
    });

    expect(prisma.fornecedor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { razaoSocial: 'asc' } }),
    );
  });

  it('usa createdAt quando sortBy não pertence à whitelist', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.listar('empresa-1', {
      sortBy: 'campoPrismaArbitrario',
      order: 'asc',
    });

    expect(prisma.fornecedor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    );
  });

  it('busca detalhe somente por id e empresa', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedorBase);

    await expect(
      service.buscarPorId('empresa-1', 'fornecedor-1'),
    ).resolves.toEqual(fornecedorBase);

    expect(prisma.fornecedor.findFirst).toHaveBeenCalledWith({
      where: { id: 'fornecedor-1', empresaId: 'empresa-1' },
      include: {
        historicos: {
          include: {
            usuario: {
              select: { id: true, nome: true, email: true, tipo: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  });

  it.each(['inexistente', 'fornecedor-de-outro-tenant'])(
    'retorna o mesmo 404 para %s',
    async (id) => {
      prisma.fornecedor.findFirst.mockResolvedValue(null);

      await expect(service.buscarPorId('empresa-1', id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.fornecedor.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id, empresaId: 'empresa-1' } }),
      );
    },
  );

  it('atualiza somente depois da busca tenant-aware e registra alterações', async () => {
    const atualizado = {
      ...fornecedorBase,
      razaoSocial: 'Fornecedor Novo',
      documento: '98765432000100',
      email: 'novo@fornecedor.com',
    };
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedorBase);
    prisma.fornecedor.update.mockResolvedValue(atualizado);
    prisma.fornecedorHistorico.create.mockResolvedValue({});

    await service.atualizar(
      'empresa-1',
      'fornecedor-1',
      {
        razaoSocial: '  Fornecedor Novo  ',
        documento: '98.765.432/0001-00',
        email: '  NOVO@FORNECEDOR.COM  ',
      },
      usuario,
    );

    expect(prisma.fornecedor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fornecedor-1', empresaId: 'empresa-1' },
      }),
    );
    expect(prisma.fornecedor.update).toHaveBeenCalledWith({
      where: { id: 'fornecedor-1' },
      data: expect.objectContaining({
        razaoSocial: 'Fornecedor Novo',
        documento: '98765432000100',
        email: 'novo@fornecedor.com',
      }) as unknown,
    });
    expect(
      prisma.fornecedor.findFirst.mock.invocationCallOrder[0],
    ).toBeLessThan(prisma.fornecedor.update.mock.invocationCallOrder[0]);
    expect(prisma.fornecedorHistorico.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fornecedorId: 'fornecedor-1',
        descricao: expect.stringContaining('Fornecedor atualizado.') as unknown,
        usuarioId: 'usuario-1',
      }) as unknown,
    });
  });

  it('não atualiza fornecedor que não pertence ao tenant', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);

    await expect(
      service.atualizar(
        'empresa-1',
        'fornecedor-outro-tenant',
        { razaoSocial: 'Alterado' },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.fornecedor.update).not.toHaveBeenCalled();
  });

  it('ativa fornecedor inativo e registra histórico', async () => {
    const inativo = { ...fornecedorBase, ativo: false };
    prisma.fornecedor.findFirst.mockResolvedValue(inativo);
    prisma.fornecedor.update.mockResolvedValue(fornecedorBase);
    prisma.fornecedorHistorico.create.mockResolvedValue({});

    await service.ativar('empresa-1', 'fornecedor-1', usuario);

    expect(prisma.fornecedor.update).toHaveBeenCalledWith({
      where: { id: 'fornecedor-1' },
      data: { ativo: true },
    });
    expect(prisma.fornecedorHistorico.create).toHaveBeenCalledWith({
      data: {
        fornecedorId: 'fornecedor-1',
        descricao: 'Fornecedor ativado.',
        usuarioId: 'usuario-1',
      },
    });
  });

  it('não repete ativação nem histórico quando já está ativo', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedorBase);

    await expect(
      service.ativar('empresa-1', 'fornecedor-1', usuario),
    ).resolves.toEqual(fornecedorBase);
    expect(prisma.fornecedor.update).not.toHaveBeenCalled();
    expect(prisma.fornecedorHistorico.create).not.toHaveBeenCalled();
  });

  it('desativa fornecedor ativo e registra histórico', async () => {
    const inativo = { ...fornecedorBase, ativo: false };
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedorBase);
    prisma.fornecedor.update.mockResolvedValue(inativo);
    prisma.fornecedorHistorico.create.mockResolvedValue({});

    await service.desativar('empresa-1', 'fornecedor-1', usuario);

    expect(prisma.fornecedor.update).toHaveBeenCalledWith({
      where: { id: 'fornecedor-1' },
      data: { ativo: false },
    });
    expect(prisma.fornecedorHistorico.create).toHaveBeenCalledWith({
      data: {
        fornecedorId: 'fornecedor-1',
        descricao: 'Fornecedor desativado.',
        usuarioId: 'usuario-1',
      },
    });
  });

  it('não repete desativação nem histórico quando já está inativo', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue({
      ...fornecedorBase,
      ativo: false,
    });

    await service.desativar('empresa-1', 'fornecedor-1', usuario);

    expect(prisma.fornecedor.update).not.toHaveBeenCalled();
    expect(prisma.fornecedorHistorico.create).not.toHaveBeenCalled();
  });

  it('não altera status de fornecedor fora do tenant', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);

    await expect(
      service.ativar('empresa-1', 'fornecedor-outro-tenant', usuario),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.desativar('empresa-1', 'fornecedor-outro-tenant', usuario),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.fornecedor.update).not.toHaveBeenCalled();
  });

  it('adiciona histórico manual normalizado somente após validar tenant', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedorBase);
    prisma.fornecedorHistorico.create.mockResolvedValue({ id: 'historico-1' });

    await service.adicionarHistorico(
      'empresa-1',
      'fornecedor-1',
      { descricao: '  Contato realizado.  ' },
      usuario,
    );

    expect(prisma.fornecedorHistorico.create).toHaveBeenCalledWith({
      data: {
        fornecedorId: 'fornecedor-1',
        descricao: 'Contato realizado.',
        usuarioId: 'usuario-1',
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, tipo: true },
        },
      },
    });
  });

  it('não adiciona histórico para fornecedor fora do tenant', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(null);

    await expect(
      service.adicionarHistorico(
        'empresa-1',
        'fornecedor-outro-tenant',
        { descricao: 'Tentativa' },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.fornecedorHistorico.create).not.toHaveBeenCalled();
  });

  it('lista histórico somente após validar fornecedor no tenant', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedorBase);
    prisma.fornecedorHistorico.findMany.mockResolvedValue([]);

    await service.listarHistorico('empresa-1', 'fornecedor-1');

    expect(prisma.fornecedor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fornecedor-1', empresaId: 'empresa-1' },
      }),
    );
    expect(prisma.fornecedorHistorico.findMany).toHaveBeenCalledWith({
      where: { fornecedorId: 'fornecedor-1' },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, tipo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it.each([
    ['ordem normal', ['empresaId', 'documento']],
    ['ordem invertida', ['documento', 'empresaId']],
  ])(
    'converte P2002 composto em conflito amigável na %s',
    async (_, target) => {
      prisma.fornecedor.create.mockRejectedValue(erroP2002(target));

      await expect(
        service.criar(
          'empresa-1',
          { razaoSocial: 'Duplicado', documento: '12.345.678/0001-99' },
          usuario,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'Já existe um fornecedor com este CPF/CNPJ nesta empresa.',
        ),
      );
      expect(prisma.fornecedorHistorico.create).not.toHaveBeenCalled();
    },
  );

  it('converte P2002 composto também na atualização', async () => {
    prisma.fornecedor.findFirst.mockResolvedValue(fornecedorBase);
    prisma.fornecedor.update.mockRejectedValue(
      erroP2002(['empresaId', 'documento']),
    );

    await expect(
      service.atualizar(
        'empresa-1',
        'fornecedor-1',
        { documento: '98.765.432/0001-00' },
        usuario,
      ),
    ).rejects.toThrow(
      'Já existe um fornecedor com este CPF/CNPJ nesta empresa.',
    );
  });

  it.each([
    ['meta ausente', erroP2002()],
    [
      'target ausente',
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: {},
      }),
    ],
    ['target não array', erroP2002('Fornecedor_empresaId_documento_key')],
    ['target incompleto', erroP2002(['documento'])],
    [
      'target com campo adicional',
      erroP2002(['empresaId', 'documento', 'outro']),
    ],
    ['outra constraint', erroP2002(['empresaId', 'razaoSocial'])],
    [
      'outro código Prisma',
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '6.19.3',
      }),
    ],
    ['erro não Prisma', new Error('Erro original')],
  ])('relança o erro original para %s', async (_, erro) => {
    prisma.fornecedor.create.mockRejectedValue(erro);

    await expect(
      service.criar(
        'empresa-1',
        { razaoSocial: 'Fornecedor', documento: '12345678000199' },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('não converte falha P2002 do histórico após criação', async () => {
    const erro = erroP2002(['empresaId', 'documento']);
    prisma.fornecedor.create.mockResolvedValue(fornecedorBase);
    prisma.fornecedorHistorico.create.mockRejectedValue(erro);

    await expect(
      service.criar(
        'empresa-1',
        { razaoSocial: 'Fornecedor', documento: '12345678000199' },
        usuario,
      ),
    ).rejects.toBe(erro);
  });
});
