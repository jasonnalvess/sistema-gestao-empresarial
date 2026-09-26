import { StatusContaPagar, StatusContaReceber } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { FinanceiroService } from './financeiro.service';

const resumoVazio = [
  { _sum: {} },
  { _sum: {} },
  { _sum: {} },
  { _sum: {} },
  0,
  0,
  0,
  0,
  0,
  0,
];

describe('FinanceiroService', () => {
  let service: FinanceiroService;

  const prismaServiceMock = {
    $transaction: jest.fn(),
    contaPagar: {
      updateMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    contaReceber: {
      updateMany: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  function configurarResumo(resultados = resumoVazio) {
    prismaServiceMock.$transaction
      .mockResolvedValueOnce([{}, {}])
      .mockResolvedValueOnce(resultados);
  }

  function esperarConsultasDoResumoComEmpresa(empresaId: string) {
    for (const indice of [1, 2]) {
      expect(prismaServiceMock.contaPagar.aggregate).toHaveBeenNthCalledWith(
        indice,
        expect.objectContaining({
          where: expect.objectContaining({ empresaId }) as unknown,
        }),
      );
      expect(prismaServiceMock.contaReceber.aggregate).toHaveBeenNthCalledWith(
        indice,
        expect.objectContaining({
          where: expect.objectContaining({ empresaId }) as unknown,
        }),
      );
    }

    for (const indice of [1, 2, 3]) {
      expect(prismaServiceMock.contaPagar.count).toHaveBeenNthCalledWith(
        indice,
        expect.objectContaining({
          where: expect.objectContaining({ empresaId }) as unknown,
        }),
      );
      expect(prismaServiceMock.contaReceber.count).toHaveBeenNthCalledWith(
        indice,
        expect.objectContaining({
          where: expect.objectContaining({ empresaId }) as unknown,
        }),
      );
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceiroService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<FinanceiroService>(FinanceiroService);

    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('limita atualização de vencimentos e todas as agregações ao empresaId', async () => {
    configurarResumo();

    await service.resumo('empresa-1', {});

    expect(prismaServiceMock.contaPagar.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-1' }) as unknown,
      }),
    );
    expect(prismaServiceMock.contaReceber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-1' }) as unknown,
      }),
    );
    esperarConsultasDoResumoComEmpresa('empresa-1');
  });

  it('preserva filtros de período e exclusão de contas canceladas', async () => {
    configurarResumo();

    await service.resumo('empresa-1', {
      vencimentoInicio: '2026-08-01',
      vencimentoFim: '2026-08-31',
    });

    expect(prismaServiceMock.contaPagar.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          empresaId: 'empresa-1',
          dataVencimento: {
            gte: new Date('2026-08-01'),
            lte: new Date('2026-08-31T23:59:59.999Z'),
          },
          status: { not: StatusContaPagar.CANCELADA },
        },
      }),
    );
    expect(prismaServiceMock.contaReceber.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          empresaId: 'empresa-1',
          dataVencimento: {
            gte: new Date('2026-08-01'),
            lte: new Date('2026-08-31T23:59:59.999Z'),
          },
          status: { not: StatusContaReceber.CANCELADA },
        },
      }),
    );
  });

  it('preserva cálculos e formato da resposta', async () => {
    configurarResumo([
      {
        _sum: {
          valorOriginal: 100,
          valorPago: 30,
          valorAberto: 70,
          valorDesconto: 2,
          valorJuros: 3,
          valorMulta: 4,
        },
      },
      {
        _sum: {
          valorOriginal: 200,
          valorRecebido: 80,
          valorAberto: 120,
          valorDesconto: 5,
          valorJuros: 6,
          valorMulta: 7,
        },
      },
      { _sum: { valorAberto: 20 } },
      { _sum: { valorAberto: 40 } },
      3,
      4,
      2,
      3,
      1,
      2,
    ]);

    const resultado = await service.resumo('empresa-1', {});

    expect(resultado).toEqual({
      periodo: { vencimentoInicio: null, vencimentoFim: null },
      pagar: {
        valorOriginal: 100,
        valorPago: 30,
        valorAberto: 70,
        valorVencido: 20,
        descontos: 2,
        juros: 3,
        multas: 4,
        quantidade: 3,
        quantidadeEmAberto: 2,
        quantidadeVencidas: 1,
      },
      receber: {
        valorOriginal: 200,
        valorRecebido: 80,
        valorAberto: 120,
        valorVencido: 40,
        descontos: 5,
        juros: 6,
        multas: 7,
        quantidade: 4,
        quantidadeEmAberto: 3,
        quantidadeVencidas: 2,
      },
      consolidado: {
        saldoProjetado: 50,
        resultadoRealizado: 50,
        saldoVencido: 20,
        totalVencido: 60,
        contasEmAberto: 5,
        contasVencidas: 3,
      },
    });
  });

  it('mantém empresas diferentes em consultas independentes', async () => {
    configurarResumo();
    configurarResumo();

    await service.resumo('empresa-a', {});
    await service.resumo('empresa-b', {});

    expect(prismaServiceMock.contaPagar.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-a' }) as unknown,
      }),
    );
    expect(prismaServiceMock.contaPagar.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-b' }) as unknown,
      }),
    );
    expect(prismaServiceMock.contaPagar.aggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-a' }) as unknown,
      }),
    );
    expect(prismaServiceMock.contaPagar.aggregate).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-b' }) as unknown,
      }),
    );
  });

  it('não executa consultas com empresaId undefined', async () => {
    configurarResumo();

    await service.resumo('empresa-1', {});

    expect(prismaServiceMock.contaPagar.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-1' }) as unknown,
      }),
    );
    expect(prismaServiceMock.contaReceber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-1' }) as unknown,
      }),
    );
    esperarConsultasDoResumoComEmpresa('empresa-1');
  });
});
