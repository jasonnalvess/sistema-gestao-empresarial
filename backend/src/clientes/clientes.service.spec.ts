import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from './clientes.service';

type PrismaServiceMock = {
  $transaction: jest.Mock;
  cliente: {
    create: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  clienteHistorico: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
};

describe('ClientesService', () => {
  let service: ClientesService;
  let prisma: PrismaServiceMock;

  const usuario: AuthenticatedUser = {
    id: 'usuario-1',
    email: 'usuario@empresa.com',
    tipo: 'ADMIN_EMPRESA',
    empresaId: 'empresa-1',
  };
  const superAdmin: AuthenticatedUser = {
    id: 'super-1',
    email: 'super@sistema.com',
    tipo: 'SUPER_ADMIN',
    empresaId: null,
  };
  const clienteBase = {
    id: 'cliente-1',
    nome: 'Cliente Antigo',
    tipo: 'PF',
    documento: '12345678901',
    email: 'antigo@cliente.com',
    telefone: '1111',
    celular: '9999',
    endereco: 'Rua A',
    cidade: 'Fortaleza',
    estado: 'CE',
    cep: '60000000',
    observacao: null,
    ativo: true,
    empresaId: 'empresa-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    agendaEventos: [],
    ordensServico: [],
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      cliente: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      clienteHistorico: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClientesService>(ClientesService);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  it('deve criar cliente normalizado na empresa autenticada e registrar histórico', async () => {
    const criado = { ...clienteBase, nome: 'Cliente Novo' };
    prisma.cliente.create.mockResolvedValue(criado);
    prisma.clienteHistorico.create.mockResolvedValue({ id: 'historico-1' });

    await expect(
      service.criar(
        {
          nome: '  Cliente Novo  ',
          tipo: 'PJ',
          documento: '12.345.678/0001-99',
          email: '  CLIENTE@EMAIL.COM  ',
          telefone: '  3333-4444  ',
          celular: '  99999-8888  ',
          endereco: '  Rua B  ',
          cidade: '  Fortaleza  ',
          estado: ' ce ',
          cep: '60.000-000',
          observacao: '  Preferencial  ',
        },
        usuario,
      ),
    ).resolves.toEqual(criado);

    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: {
        nome: 'Cliente Novo',
        tipo: 'PJ',
        documento: '12345678000199',
        email: 'cliente@email.com',
        telefone: '3333-4444',
        celular: '99999-8888',
        endereco: 'Rua B',
        cidade: 'Fortaleza',
        estado: 'CE',
        cep: '60000000',
        observacao: 'Preferencial',
        empresaId: 'empresa-1',
      },
    });
    expect(prisma.clienteHistorico.create).toHaveBeenCalledWith({
      data: {
        clienteId: 'cliente-1',
        descricao: 'Cliente cadastrado.',
        usuarioId: 'usuario-1',
      },
    });
  });

  it('deve manter documento opcional e aplicar o tipo padrão', async () => {
    prisma.cliente.create.mockResolvedValue(clienteBase);
    prisma.clienteHistorico.create.mockResolvedValue({});

    await service.criar({ nome: ' Cliente ' }, usuario);

    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: {
        nome: 'Cliente',
        tipo: 'PF',
        documento: undefined,
        email: undefined,
        telefone: undefined,
        celular: undefined,
        endereco: undefined,
        cidade: undefined,
        estado: undefined,
        cep: undefined,
        observacao: undefined,
        empresaId: 'empresa-1',
      },
    });
  });

  it('deve normalizar atualização e registrar somente alterações efetivas detalhadas', async () => {
    const atualizado = {
      ...clienteBase,
      nome: 'Cliente Novo',
      email: 'novo@cliente.com',
      estado: 'SP',
      cep: '01001000',
    };
    prisma.cliente.findUnique.mockResolvedValue(clienteBase);
    prisma.cliente.update.mockResolvedValue(atualizado);
    prisma.clienteHistorico.create.mockResolvedValue({});

    await service.atualizar(
      'cliente-1',
      {
        nome: '  Cliente Novo  ',
        email: '  NOVO@CLIENTE.COM ',
        estado: ' sp ',
        cep: '01.001-000',
      },
      usuario,
    );

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-1' },
      data: {
        nome: 'Cliente Novo',
        tipo: undefined,
        documento: undefined,
        email: 'novo@cliente.com',
        telefone: undefined,
        celular: undefined,
        endereco: undefined,
        cidade: undefined,
        estado: 'SP',
        cep: '01001000',
        observacao: undefined,
      },
    });
    expect(prisma.clienteHistorico.create).toHaveBeenCalledWith({
      data: {
        clienteId: 'cliente-1',
        descricao:
          'Cliente atualizado.\nNome: Cliente Antigo → Cliente Novo\nE-mail: antigo@cliente.com → novo@cliente.com\nEstado: CE → SP\nCEP: 60000000 → 01001000',
        usuarioId: 'usuario-1',
      },
    });
  });

  it('não deve registrar histórico quando a atualização não mudar valores', async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteBase);
    prisma.cliente.update.mockResolvedValue(clienteBase);

    await service.atualizar('cliente-1', { nome: ' Cliente Antigo ' }, usuario);

    expect(prisma.clienteHistorico.create).not.toHaveBeenCalled();
  });

  it('deve retornar sem atualizar nem registrar histórico ao ativar cliente ativo', async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteBase);

    await expect(service.ativar('cliente-1', usuario)).resolves.toEqual(
      clienteBase,
    );
    expect(prisma.cliente.update).not.toHaveBeenCalled();
    expect(prisma.clienteHistorico.create).not.toHaveBeenCalled();
  });

  it('deve ativar cliente inativo e registrar histórico', async () => {
    const inativo = { ...clienteBase, ativo: false };
    prisma.cliente.findUnique.mockResolvedValue(inativo);
    prisma.cliente.update.mockResolvedValue(clienteBase);
    prisma.clienteHistorico.create.mockResolvedValue({});

    await service.ativar('cliente-1', usuario);

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-1' },
      data: { ativo: true },
    });
    expect(prisma.clienteHistorico.create).toHaveBeenCalledWith({
      data: {
        clienteId: 'cliente-1',
        descricao: 'Cliente ativado.',
        usuarioId: 'usuario-1',
      },
    });
  });

  it('deve retornar sem atualizar nem registrar histórico ao desativar cliente inativo', async () => {
    const inativo = { ...clienteBase, ativo: false };
    prisma.cliente.findUnique.mockResolvedValue(inativo);

    await expect(service.desativar('cliente-1', usuario)).resolves.toEqual(
      inativo,
    );
    expect(prisma.cliente.update).not.toHaveBeenCalled();
    expect(prisma.clienteHistorico.create).not.toHaveBeenCalled();
  });

  it('deve desativar cliente ativo e registrar histórico', async () => {
    const inativo = { ...clienteBase, ativo: false };
    prisma.cliente.findUnique.mockResolvedValue(clienteBase);
    prisma.cliente.update.mockResolvedValue(inativo);
    prisma.clienteHistorico.create.mockResolvedValue({});

    await service.desativar('cliente-1', usuario);

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-1' },
      data: { ativo: false },
    });
    expect(prisma.clienteHistorico.create).toHaveBeenCalledWith({
      data: {
        clienteId: 'cliente-1',
        descricao: 'Cliente desativado.',
        usuarioId: 'usuario-1',
      },
    });
  });

  it('deve normalizar histórico manual e preservar usuário', async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteBase);
    prisma.clienteHistorico.create.mockResolvedValue({ id: 'historico-1' });

    await service.adicionarHistorico(
      'cliente-1',
      { descricao: '  Cliente contatado.  ' },
      usuario,
    );

    expect(prisma.clienteHistorico.create).toHaveBeenCalledWith({
      data: {
        clienteId: 'cliente-1',
        descricao: 'Cliente contatado.',
        usuarioId: 'usuario-1',
      },
      include: {
        usuario: {
          select: { id: true, nome: true, email: true, tipo: true },
        },
      },
    });
  });

  it('deve listar com tenant, paginação, filtro ativo e documento normalizado', async () => {
    prisma.$transaction.mockResolvedValue([[clienteBase], 1]);

    const resultado = await service.listar(usuario, {
      page: 2,
      limit: 5,
      search: '123.456.789-01',
      tipo: 'PF',
      ativo: 'false',
    });

    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: {
        empresaId: 'empresa-1',
        OR: [
          { nome: { contains: '123.456.789-01', mode: 'insensitive' } },
          { documento: { contains: '12345678901', mode: 'insensitive' } },
          { email: { contains: '123.456.789-01', mode: 'insensitive' } },
          { celular: { contains: '123.456.789-01', mode: 'insensitive' } },
        ],
        tipo: 'PF',
        ativo: false,
      },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(resultado).toMatchObject({ data: [clienteBase] });
  });

  it('deve permitir consulta global para SUPER_ADMIN sem filtro de empresa', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.listar(superAdmin, { page: 1, limit: 10 });

    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('deve lançar NotFoundException quando cliente não existir', async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);

    await expect(
      service.buscarPorId('inexistente', usuario),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve impedir acesso a cliente de outra empresa', async () => {
    prisma.cliente.findUnique.mockResolvedValue({
      ...clienteBase,
      empresaId: 'empresa-2',
    });

    await expect(
      service.buscarPorId('cliente-1', usuario),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deve permitir que SUPER_ADMIN consulte cliente de qualquer empresa', async () => {
    const clienteOutraEmpresa = { ...clienteBase, empresaId: 'empresa-2' };
    prisma.cliente.findUnique.mockResolvedValue(clienteOutraEmpresa);

    await expect(service.buscarPorId('cliente-1', superAdmin)).resolves.toEqual(
      clienteOutraEmpresa,
    );
  });
});
