/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Matchers assimetricos do Jest expoem valores como any. */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  FormaRecebimento,
  OrigemContaReceber,
  OrigemMovimentacaoCaixa,
  Prisma,
  StatusContaReceber,
  TipoMovimentacaoCaixa,
} from '@prisma/client';
import { CaixasService } from '../caixas/caixas.service';
import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from '../vendas/vendas.service';
import { ContasReceberService } from './contas-receber.service';

function criarPrismaMock() {
  const prisma = {
    cliente: { findFirst: jest.fn() },
    ordemServico: { findFirst: jest.fn() },
    contaReceber: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    recebimentoContaReceber: { create: jest.fn() },
    contaReceberHistorico: { create: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operacao: unknown) => {
    if (Array.isArray(operacao)) return Promise.all(operacao);
    return (operacao as (tx: typeof prisma) => Promise<unknown>)(prisma);
  });
  const prismaSemCaixa: typeof prisma & { caixa?: never } = prisma;
  return prismaSemCaixa;
}

type PrismaMock = ReturnType<typeof criarPrismaMock>;
const usuario = {
  id: 'usuario-1',
  email: 'usuario@teste.com',
  empresaId: 'empresa-1',
  tipo: 'ADMIN_EMPRESA',
};
const cliente = { id: 'cliente-1', empresaId: 'empresa-1', ativo: true };
const ordem = {
  id: 'ordem-1',
  empresaId: 'empresa-1',
  clienteId: 'cliente-1',
  numero: 10,
  titulo: 'Manutenção',
  status: 'CONCLUIDA',
  cliente,
};
const conta = (
  status: StatusContaReceber = StatusContaReceber.PENDENTE,
  aberto = 100,
  vendaId: string | null = null,
) => ({
  id: 'conta-1',
  numero: 1,
  empresaId: 'empresa-1',
  clienteId: 'cliente-1',
  ordemServicoId: null,
  vendaId,
  descricao: 'Conta',
  documento: null,
  status,
  valorOriginal: new Prisma.Decimal(100),
  valorDesconto: new Prisma.Decimal(0),
  valorJuros: new Prisma.Decimal(0),
  valorMulta: new Prisma.Decimal(0),
  valorRecebido: new Prisma.Decimal(100 - aberto),
  valorAberto: new Prisma.Decimal(aberto),
  parcelaAtual: 1,
  totalParcelas: 1,
  dataVencimento: new Date('2026-08-10'),
  recebimentos: [],
  historicos: [],
  cliente,
  ordemServico: null,
  venda: null,
});

describe('ContasReceberService', () => {
  let prisma: PrismaMock;
  let caixas: { registrarMovimentacaoFinanceira: jest.Mock };
  let vendas: { concluirSeQuitada: jest.Mock };
  let service: ContasReceberService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    caixas = { registrarMovimentacaoFinanceira: jest.fn() };
    vendas = { concluirSeQuitada: jest.fn() };
    service = new ContasReceberService(
      prisma as unknown as PrismaService,
      vendas as unknown as VendasService,
      caixas as unknown as CaixasService,
    );
    prisma.cliente.findFirst.mockResolvedValue(cliente);
    prisma.ordemServico.findFirst.mockResolvedValue(ordem);
    prisma.contaReceber.findFirst.mockImplementation(
      (args: { where?: { id?: string } }) =>
        Promise.resolve(args.where?.id ? conta() : null),
    );
    prisma.contaReceber.findUniqueOrThrow.mockResolvedValue(
      conta(StatusContaReceber.CANCELADA),
    );
    prisma.contaReceber.create.mockResolvedValue(conta());
    prisma.contaReceber.update.mockResolvedValue(conta());
    prisma.contaReceber.updateMany.mockResolvedValue({ count: 1 });
    prisma.contaReceber.findMany.mockResolvedValue([]);
    prisma.contaReceber.count.mockResolvedValue(0);
    prisma.recebimentoContaReceber.create.mockResolvedValue({
      id: 'recebimento-1',
    });
    prisma.contaReceberHistorico.create.mockResolvedValue({
      id: 'historico-1',
    });
    prisma.contaReceberHistorico.findMany.mockResolvedValue([]);
    caixas.registrarMovimentacaoFinanceira.mockResolvedValue({
      movimentacao: { id: 'movimento-1' },
      caixa: { id: 'caixa-1' },
    });
  });

  it('cria conta manual com Decimal, tenant e histórico', async () => {
    await service.criar(
      'empresa-1',
      {
        descricao: ' Conta ',
        dataVencimento: '2026-08-10',
        valorOriginal: 100,
        origem: OrigemContaReceber.MANUAL,
      },
      usuario,
    );
    expect(prisma.contaReceber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          descricao: 'Conta',
          valorOriginal: new Prisma.Decimal(100),
          valorAberto: new Prisma.Decimal(100),
        }),
      }),
    );
    expect(prisma.contaReceberHistorico.create).toHaveBeenCalled();
  });

  it('rejeita cliente de outro tenant sem criar conta', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);
    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
          clienteId: 'cliente-1',
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contaReceber.create).not.toHaveBeenCalled();
  });

  it('gera conta a partir de ordem concluída dentro da transação', async () => {
    await service.gerarAPartirOrdemServico(
      'empresa-1',
      'ordem-1',
      {
        dataVencimento: '2026-08-10',
        valorOriginal: 100,
      },
      usuario,
    );
    expect(prisma.ordemServico.findFirst).toHaveBeenCalled();
    expect(prisma.contaReceber.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ordemServicoId: 'ordem-1',
          clienteId: 'cliente-1',
          empresaId: 'empresa-1',
        }),
      }),
    );
  });

  it('rejeita ordem incompatível ou já vinculada', async () => {
    prisma.ordemServico.findFirst.mockResolvedValue({
      ...ordem,
      status: 'ABERTA',
    });
    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toThrow('concluídas');
    prisma.ordemServico.findFirst.mockResolvedValue(ordem);
    prisma.contaReceber.findFirst.mockResolvedValue({ numero: 7 });
    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toThrow('já possui');
  });

  it('converte conflito do índice parcial de ordem em resposta amigável', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: 'ContaReceber_ordemServicoId_ativa_key' },
    });
    prisma.contaReceber.create.mockRejectedValue(erro);

    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toMatchObject({
      status: 409,
      message:
        'Já existe uma conta a receber ativa para esta Ordem de Serviço.',
    });
    expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
  });

  it.each([
    ['target diferente', { target: 'outra_constraint' }],
    ['target ausente', {}],
    ['meta ausente', undefined],
  ])('relança P2002 da ordem com %s', async (_cenario, meta) => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      ...(meta === undefined ? {} : { meta }),
    });
    prisma.contaReceber.create.mockRejectedValue(erro);

    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('relança outro código Prisma na geração por ordem', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('falha', {
      code: 'P2003',
      clientVersion: '6.19.3',
      meta: { target: 'ContaReceber_ordemServicoId_ativa_key' },
    });
    prisma.contaReceber.create.mockRejectedValue(erro);

    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('relança erro não Prisma na geração por ordem', async () => {
    const erro = new Error('falha de persistência');
    prisma.contaReceber.create.mockRejectedValue(erro);

    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('não converte falha posterior do histórico em conflito de ordem', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: 'ContaReceber_ordemServicoId_ativa_key' },
    });
    prisma.contaReceberHistorico.create.mockRejectedValue(erro);

    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('permite nova geração quando não existe conta ativa para a ordem', async () => {
    await service.gerarAPartirOrdemServico(
      'empresa-1',
      'ordem-1',
      {
        dataVencimento: '2026-08-10',
        valorOriginal: 100,
      },
      usuario,
    );

    expect(prisma.contaReceber.findFirst).toHaveBeenCalledWith({
      where: {
        empresaId: 'empresa-1',
        ordemServicoId: 'ordem-1',
        status: { not: StatusContaReceber.CANCELADA },
      },
      select: { numero: true },
    });
    expect(prisma.contaReceber.create).toHaveBeenCalled();
  });

  it('retorna o mesmo 404 para ordem inexistente ou externa', async () => {
    prisma.ordemServico.findFirst.mockResolvedValue(null);

    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.ordemServico.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ordem-1', empresaId: 'empresa-1' },
      }),
    );
    expect(prisma.contaReceber.create).not.toHaveBeenCalled();
  });

  it('trata estruturalmente duas gerações concorrentes sem segundo histórico', async () => {
    const erroConcorrencia = new Prisma.PrismaClientKnownRequestError(
      'unique',
      {
        code: 'P2002',
        clientVersion: '6.19.3',
        meta: { target: 'ContaReceber_ordemServicoId_ativa_key' },
      },
    );
    prisma.contaReceber.create
      .mockResolvedValueOnce(conta())
      .mockRejectedValueOnce(erroConcorrencia);

    const resultados = await Promise.allSettled([
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-1',
        {
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ]);

    expect(resultados.map((resultado) => resultado.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    const rejeitado = resultados.find(
      (resultado): resultado is PromiseRejectedResult =>
        resultado.status === 'rejected',
    );
    expect(rejeitado?.reason).toMatchObject({
      status: 409,
      message:
        'Já existe uma conta a receber ativa para esta Ordem de Serviço.',
    });
    expect(prisma.contaReceber.create).toHaveBeenCalledTimes(2);
    expect(prisma.contaReceberHistorico.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    [['empresaId', 'numero'], 'numeração'],
    [['recebimentoContaReceberId'], 'já possui movimentação'],
  ])('diferencia P2002 de %s', async (target, mensagem) => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target },
    });
    if (target.includes('recebimentoContaReceberId')) {
      caixas.registrarMovimentacaoFinanceira.mockRejectedValue(erro);
      await expect(
        service.registrarRecebimento(
          'empresa-1',
          'conta-1',
          {
            valor: 20,
            caixaId: 'caixa-1',
            formaRecebimento: FormaRecebimento.PIX,
          },
          usuario,
        ),
      ).rejects.toThrow(mensagem);
    } else {
      prisma.contaReceber.create.mockRejectedValue(erro);
      await expect(
        service.criar(
          'empresa-1',
          {
            descricao: 'Conta',
            dataVencimento: '2026-08-10',
            valorOriginal: 100,
          },
          usuario,
        ),
      ).rejects.toThrow(mensagem);
    }
  });

  it('propaga P2002 desconhecido', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['outra'] },
    });
    prisma.contaReceber.create.mockRejectedValue(erro);
    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('registra recebimento parcial com Decimal e lock', async () => {
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      {
        valor: 40,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorRecebido: new Prisma.Decimal(40),
          valorAberto: new Prisma.Decimal(60),
          status: StatusContaReceber.PARCIALMENTE_RECEBIDA,
        }),
      }),
    );
  });

  it('recebimento total exige saldo exatamente zero', async () => {
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      {
        valor: 100,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorAberto: new Prisma.Decimal(0),
          status: StatusContaReceber.RECEBIDA,
        }),
      }),
    );
  });

  it('saldo de um centavo permanece parcialmente recebido', async () => {
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      {
        valor: 99.99,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorAberto: new Prisma.Decimal('0.01'),
          status: StatusContaReceber.PARCIALMENTE_RECEBIDA,
        }),
      }),
    );
  });

  it('aplica juros, multa e desconto sem ponto flutuante', async () => {
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      {
        valor: 105,
        juros: 5,
        multa: 2,
        desconto: 2,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          valorJuros: new Prisma.Decimal(5),
          valorMulta: new Prisma.Decimal(2),
          valorDesconto: new Prisma.Decimal(2),
          valorAberto: new Prisma.Decimal(0),
        }),
      }),
    );
  });

  it.each([0, -1])('rejeita valor inválido %s sem efeitos', async (valor) => {
    await expect(
      service.registrarRecebimento(
        'empresa-1',
        'conta-1',
        {
          valor,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('valores do recebimento');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
  });

  it('rejeita recebimento maior que o saldo sem efeitos', async () => {
    await expect(
      service.registrarRecebimento(
        'empresa-1',
        'conta-1',
        {
          valor: 100.01,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('maior que o saldo');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it.each([
    ['valor', { valor: 10.001 }],
    ['juros', { valor: 10, juros: 0.009 }],
    ['multa', { valor: 10, multa: 1.999 }],
    ['desconto', { valor: 10, desconto: 99.995 }],
  ])(
    'rejeita precisão inválida em %s antes dos efeitos',
    async (_campo, valores) => {
      await expect(
        service.registrarRecebimento(
          'empresa-1',
          'conta-1',
          {
            ...valores,
            formaRecebimento: FormaRecebimento.PIX,
          },
          usuario,
        ),
      ).rejects.toThrow('duas casas decimais');
      expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
      expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
    },
  );

  it('usa o mesmo tx e increment do Caixa no recebimento', async () => {
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      {
        valor: 20,
        caixaId: 'caixa-1',
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(caixas.registrarMovimentacaoFinanceira).toHaveBeenCalledWith(
      prisma,
      'empresa-1',
      expect.objectContaining({
        caixaId: 'caixa-1',
        tipo: TipoMovimentacaoCaixa.ENTRADA,
        origem: OrigemMovimentacaoCaixa.CONTA_RECEBER,
        recebimentoContaReceberId: 'recebimento-1',
        valor: new Prisma.Decimal(20),
      }),
    );
    expect(prisma.caixa).toBeUndefined();
  });

  it('falha do Caixa reverte o fluxo lógico sem atualizar conta ou histórico', async () => {
    caixas.registrarMovimentacaoFinanceira.mockRejectedValue(
      new BadRequestException('Caixa indisponível'),
    );
    await expect(
      service.registrarRecebimento(
        'empresa-1',
        'conta-1',
        {
          valor: 20,
          caixaId: 'caixa-1',
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('Caixa indisponível');
    expect(prisma.contaReceber.update).not.toHaveBeenCalled();
    expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
  });

  it('falha do histórico propaga para rollback da transação', async () => {
    const erro = new Error('histórico falhou');
    prisma.contaReceberHistorico.create.mockRejectedValue(erro);
    await expect(
      service.registrarRecebimento(
        'empresa-1',
        'conta-1',
        {
          valor: 20,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
    expect(prisma.contaReceber.update).toHaveBeenCalled();
  });

  it('segunda tentativa após quitação não cria efeitos', async () => {
    prisma.contaReceber.findFirst.mockResolvedValue(
      conta(StatusContaReceber.RECEBIDA, 0),
    );
    await expect(
      service.registrarRecebimento(
        'empresa-1',
        'conta-1',
        {
          valor: 1,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('já foi recebida');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it('operação concorrente derrotada observa o estado já recebido', async () => {
    prisma.contaReceber.findFirst.mockResolvedValue(
      conta(StatusContaReceber.RECEBIDA, 0),
    );
    await expect(
      service.registrarRecebimento(
        'empresa-1',
        'conta-1',
        {
          valor: 100,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toThrow('já foi recebida');
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();
  });

  it('protege tenant antes dos efeitos e SUPER_ADMIN usa o tenant explícito', async () => {
    prisma.contaReceber.findFirst.mockResolvedValue(null);
    await expect(
      service.registrarRecebimento(
        'empresa-1',
        'conta-externa',
        {
          valor: 20,
          formaRecebimento: FormaRecebimento.PIX,
        },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.recebimentoContaReceber.create).not.toHaveBeenCalled();

    prisma.contaReceber.findFirst.mockResolvedValue(conta());
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      {
        valor: 20,
        caixaId: 'caixa-1',
        formaRecebimento: FormaRecebimento.PIX,
      },
      {
        id: 'super',
        email: 'super.com',
        empresaId: null,
        tipo: 'SUPER_ADMIN',
      },
    );
    expect(caixas.registrarMovimentacaoFinanceira).toHaveBeenCalledWith(
      prisma,
      'empresa-1',
      expect.any(Object),
    );
  });

  it('serializa conta de venda e conclui a venda no mesmo tx', async () => {
    prisma.contaReceber.findFirst.mockResolvedValue(
      conta(StatusContaReceber.PENDENTE, 100, 'venda-1'),
    );
    prisma.contaReceber.update.mockResolvedValue(
      conta(StatusContaReceber.RECEBIDA, 0, 'venda-1'),
    );
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      {
        valor: 100,
        formaRecebimento: FormaRecebimento.PIX,
      },
      usuario,
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(vendas.concluirSeQuitada).toHaveBeenCalledWith(
      'venda-1',
      'usuario-1',
      prisma,
    );
  });

  it('cancela condicionalmente com histórico', async () => {
    await service.cancelar('empresa-1', 'conta-1', usuario);
    expect(prisma.contaReceber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 'empresa-1',
          recebimentos: { none: {} },
        }),
      }),
    );
    expect(prisma.contaReceberHistorico.create).toHaveBeenCalled();
  });

  it('bloqueia cancelamento com recebimentos', async () => {
    prisma.contaReceber.findFirst.mockResolvedValue({
      ...conta(),
      recebimentos: [{ id: 'recebimento-1' }],
    });
    await expect(
      service.cancelar('empresa-1', 'conta-1', usuario),
    ).rejects.toThrow('com recebimentos');
    expect(prisma.contaReceber.updateMany).not.toHaveBeenCalled();
  });

  it('cancelamento concorrente derrotado não cria histórico', async () => {
    prisma.contaReceber.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.cancelar('empresa-1', 'conta-1', usuario),
    ).rejects.toThrow('foi alterada');
    expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
  });

  it('cancelamento repetido é idempotente', async () => {
    const cancelada = conta(StatusContaReceber.CANCELADA);
    prisma.contaReceber.findFirst.mockResolvedValue(cancelada);
    await expect(
      service.cancelar('empresa-1', 'conta-1', usuario),
    ).resolves.toBe(cancelada);
    expect(prisma.contaReceber.updateMany).not.toHaveBeenCalled();
  });

  it('edição bloqueia e rejeita precisão inválida sem persistir', async () => {
    await expect(
      service.atualizar(
        'empresa-1',
        'conta-1',
        {
          valorOriginal: 10.001,
        },
        usuario,
      ),
    ).rejects.toThrow('duas casas decimais');
    expect(prisma.contaReceber.update).not.toHaveBeenCalled();
  });

  it('lista e atualiza vencimentos sempre no mesmo tenant', async () => {
    await service.listar('empresa-1', {
      search: 'Cliente',
      sortBy: 'campo-arbitrario',
      order: 'desc',
    });

    const findManyMock = prisma.contaReceber.findMany as jest.Mock<
      Promise<unknown[]>,
      [Prisma.ContaReceberFindManyArgs]
    >;
    const countMock = prisma.contaReceber.count as jest.Mock<
      Promise<number>,
      [Prisma.ContaReceberCountArgs]
    >;
    const findManyArgs = findManyMock.mock.calls[0][0];
    const countArgs = countMock.mock.calls[0][0];

    expect(findManyArgs.where).toEqual(countArgs.where);
    expect(findManyArgs.where).toEqual(
      expect.objectContaining({ empresaId: 'empresa-1' }),
    );
    expect(findManyArgs.orderBy).toEqual({ dataVencimento: 'desc' });
    expect(prisma.contaReceber.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: 'empresa-1' }),
      }),
    );
  });

  it.each([
    'numero',
    'descricao',
    'status',
    'origem',
    'dataEmissao',
    'dataVencimento',
    'valorOriginal',
    'valorAberto',
    'createdAt',
    'updatedAt',
  ] as const)('aceita sortBy tipado %s', async (sortBy) => {
    await service.listar('empresa-1', { sortBy, order: 'asc' });
    expect(prisma.contaReceber.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ orderBy: { [sortBy]: 'asc' } }),
    );
  });

  it('busca detalhe por id e empresaId e oculta outro tenant', async () => {
    await service.buscarPorId('empresa-1', 'conta-1');
    expect(prisma.contaReceber.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conta-1', empresaId: 'empresa-1' },
      }),
    );

    prisma.contaReceber.findFirst.mockResolvedValue(null);
    await expect(
      service.buscarPorId('empresa-2', 'conta-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('usa id e empresaId no SQL do lock da conta', async () => {
    await service.registrarRecebimento(
      'empresa-1',
      'conta-1',
      { valor: 20, formaRecebimento: FormaRecebimento.PIX },
      usuario,
    );

    const queryRawMock = prisma.$queryRaw as jest.Mock<
      Promise<unknown>,
      [Prisma.Sql]
    >;
    const sql = queryRawMock.mock.calls[0][0];
    expect(sql.strings.join('')).toContain('"id" = ');
    expect(sql.strings.join('')).toContain('"empresaId" = ');
    expect(sql.strings.join('')).toContain('FOR UPDATE');
    expect(sql.values).toEqual(['conta-1', 'empresa-1']);
  });

  it('consulta Cliente e Ordem de Serviço diretamente pelo tenant', async () => {
    await service.criar(
      'empresa-1',
      {
        descricao: 'Conta',
        dataVencimento: '2026-08-10',
        valorOriginal: 100,
        clienteId: 'cliente-1',
        ordemServicoId: 'ordem-1',
      },
      usuario,
    );

    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cliente-1', empresaId: 'empresa-1' },
    });
    expect(prisma.ordemServico.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ordem-1', empresaId: 'empresa-1' },
      }),
    );
  });

  it('Ordem de Serviço externa é indistinguível de inexistente', async () => {
    prisma.ordemServico.findFirst.mockResolvedValue(null);
    await expect(
      service.gerarAPartirOrdemServico(
        'empresa-1',
        'ordem-externa',
        { dataVencimento: '2026-08-10', valorOriginal: 100 },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contaReceber.create).not.toHaveBeenCalled();
  });

  it('aceita P2002 composto em ordem invertida', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['numero', 'empresaId'] },
    });
    prisma.contaReceber.create.mockRejectedValue(erro);

    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toThrow('numeração');
  });

  it.each([
    { target: ['empresaId', 'numero', 'campoExtra'] },
    { target: 'ContaReceber_empresaId_numero_key' },
    {},
  ])('relança P2002 com metadata não estrita: %o', async (meta) => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta,
    });
    prisma.contaReceber.create.mockRejectedValue(erro);

    await expect(
      service.criar(
        'empresa-1',
        {
          descricao: 'Conta',
          dataVencimento: '2026-08-10',
          valorOriginal: 100,
        },
        usuario,
      ),
    ).rejects.toBe(erro);
  });

  it('valida histórico por id + empresaId', async () => {
    await service.listarHistorico('empresa-1', 'conta-1');
    expect(prisma.contaReceber.findFirst).toHaveBeenCalledWith({
      where: { id: 'conta-1', empresaId: 'empresa-1' },
      select: { id: true },
    });

    prisma.contaReceber.findFirst.mockResolvedValue(null);
    await expect(
      service.adicionarHistorico(
        'empresa-2',
        'conta-1',
        { descricao: 'Anotação' },
        usuario,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.contaReceberHistorico.create).not.toHaveBeenCalled();
  });
});
