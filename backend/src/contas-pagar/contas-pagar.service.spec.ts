import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  FormaPagamento,
  OrigemContaPagar,
  Prisma,
  StatusContaPagar,
} from '@prisma/client';
import { CaixasService } from '../caixas/caixas.service';
import { PrismaService } from '../prisma/prisma.service';
import { ContasPagarService } from './contas-pagar.service';

function criarPrismaMock() {
  const prisma = {
    fornecedor: { findUnique: jest.fn() },
    pedidoCompra: { findUnique: jest.fn() },
    contaPagar: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pagamentoContaPagar: { create: jest.fn() },
    contaPagarHistorico: { create: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (operacao: unknown) =>
    (operacao as (tx: typeof prisma) => Promise<unknown>)(prisma),
  );
  return prisma;
}

type PrismaMock = ReturnType<typeof criarPrismaMock>;
const usuario = { id: 'usuario-1', empresaId: 'empresa-1', tipo: 'ADMIN_EMPRESA' };
const fornecedor = { id: 'fornecedor-1', empresaId: 'empresa-1', ativo: true };
const pedido = {
  id: 'pedido-1', empresaId: 'empresa-1', fornecedorId: 'fornecedor-1',
  numero: 10, status: 'RECEBIDO', valorTotal: new Prisma.Decimal(100),
  fornecedor,
};
const conta = (status = StatusContaPagar.PENDENTE, aberto = 100) => ({
  id: 'conta-1', numero: 1, empresaId: 'empresa-1', fornecedorId: 'fornecedor-1',
  pedidoCompraId: null, descricao: 'Conta', documento: null, status,
  valorOriginal: new Prisma.Decimal(100), valorDesconto: new Prisma.Decimal(0),
  valorJuros: new Prisma.Decimal(0), valorMulta: new Prisma.Decimal(0),
  valorPago: new Prisma.Decimal(100 - aberto), valorAberto: new Prisma.Decimal(aberto),
  parcelaAtual: 1, totalParcelas: 1, dataVencimento: new Date('2026-08-10'),
  pagamentos: [], historicos: [], fornecedor, pedidoCompra: null,
});

describe('ContasPagarService', () => {
  let prisma: PrismaMock;
  let caixas: { registrarMovimentacaoFinanceira: jest.Mock };
  let service: ContasPagarService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    caixas = { registrarMovimentacaoFinanceira: jest.fn() };
    service = new ContasPagarService(
      prisma as unknown as PrismaService,
      caixas as unknown as CaixasService,
    );
    prisma.fornecedor.findUnique.mockResolvedValue(fornecedor);
    prisma.pedidoCompra.findUnique.mockResolvedValue(pedido);
    prisma.contaPagar.findFirst.mockResolvedValue(null);
    prisma.contaPagar.findUnique.mockResolvedValue(conta());
    prisma.contaPagar.findUniqueOrThrow.mockResolvedValue(conta(StatusContaPagar.PAGA, 0));
    prisma.contaPagar.create.mockResolvedValue(conta());
    prisma.contaPagar.update.mockResolvedValue(conta());
    prisma.contaPagar.updateMany.mockResolvedValue({ count: 1 });
    prisma.pagamentoContaPagar.create.mockResolvedValue({ id: 'pagamento-1' });
    prisma.contaPagarHistorico.create.mockResolvedValue({ id: 'historico-1' });
    caixas.registrarMovimentacaoFinanceira.mockResolvedValue({
      movimentacao: { id: 'movimento-1' }, caixa: { id: 'caixa-1' },
    });
  });

  it('cria conta manual válida e histórico no tenant', async () => {
    await service.criar({
      descricao: ' Conta ', dataVencimento: '2026-08-10', valorOriginal: 100,
      origem: OrigemContaPagar.MANUAL,
    }, usuario);
    expect(prisma.contaPagar.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ empresaId: 'empresa-1', descricao: 'Conta' }),
    }));
    expect(prisma.contaPagarHistorico.create).toHaveBeenCalled();
  });

  it('rejeita fornecedor de outra empresa', async () => {
    prisma.fornecedor.findUnique.mockResolvedValue({ ...fornecedor, empresaId: 'empresa-2' });
    await expect(service.criar({
      descricao: 'Conta', dataVencimento: '2026-08-10', valorOriginal: 100,
      fornecedorId: 'fornecedor-1',
    }, usuario)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it.each([
    [['empresaId', 'numero'], 'numeração'],
    [['pedidoCompraId'], 'já possui uma conta'],
  ])('diferencia P2002 de %s', async (target, mensagem) => {
    prisma.contaPagar.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
      'unique', { code: 'P2002', clientVersion: '6.19.3', meta: { target } },
    ));
    await expect(service.criar({
      descricao: 'Conta', dataVencimento: '2026-08-10', valorOriginal: 100,
    }, usuario)).rejects.toThrow(mensagem);
  });

  it('propaga P2002 desconhecido', async () => {
    const erro = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002', clientVersion: '6.19.3', meta: { target: ['outra'] },
    });
    prisma.contaPagar.create.mockRejectedValue(erro);
    await expect(service.criar({
      descricao: 'Conta', dataVencimento: '2026-08-10', valorOriginal: 100,
    }, usuario)).rejects.toBe(erro);
  });

  it('gera exatamente uma conta por pedido recebido', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    await service.gerarAPartirPedidoCompra('pedido-1', {
      dataVencimento: '2026-08-10',
    }, usuario);
    expect(prisma.contaPagar.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        pedidoCompraId: 'pedido-1', parcelaAtual: 1, totalParcelas: 1,
      }),
    }));
  });

  it('rejeita pedido de outra empresa sem criar conta', async () => {
    prisma.pedidoCompra.findUnique.mockResolvedValue({ ...pedido, empresaId: 'empresa-2' });
    await expect(service.gerarAPartirPedidoCompra('pedido-1', {
      dataVencimento: '2026-08-10',
    }, usuario)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it('rejeita origem duplicada antes da criação', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue({ numero: 7 });
    await expect(service.gerarAPartirPedidoCompra('pedido-1', {
      dataVencimento: '2026-08-10',
    }, usuario)).rejects.toThrow('já possui a conta');
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it('converte perdedor concorrente da origem pelo P2002', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    prisma.contaPagar.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
      'unique', { code: 'P2002', clientVersion: '6.19.3',
        meta: { target: ['pedidoCompraId'] } },
    ));
    await expect(service.gerarAPartirPedidoCompra('pedido-1', {
      dataVencimento: '2026-08-10',
    }, usuario)).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga falha do histórico da geração para rollback', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    const erro = new Error('histórico falhou');
    prisma.contaPagarHistorico.create.mockRejectedValue(erro);
    await expect(service.gerarAPartirPedidoCompra('pedido-1', {
      dataVencimento: '2026-08-10',
    }, usuario)).rejects.toBe(erro);
  });

  it('registra pagamento parcial com Decimal e lock', async () => {
    prisma.contaPagar.update.mockResolvedValue(conta(StatusContaPagar.PARCIALMENTE_PAGA, 60));
    await service.registrarPagamento('conta-1', {
      valor: 40, formaPagamento: FormaPagamento.PIX,
    }, usuario);
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        valorPago: new Prisma.Decimal(40), valorAberto: new Prisma.Decimal(60),
        status: StatusContaPagar.PARCIALMENTE_PAGA,
      }),
    }));
  });

  it('registra pagamento total e zera saldo', async () => {
    await service.registrarPagamento('conta-1', {
      valor: 100, formaPagamento: FormaPagamento.PIX,
    }, usuario);
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        valorAberto: new Prisma.Decimal(0), status: StatusContaPagar.PAGA,
      }),
    }));
  });

  it('preserva juros, multa e desconto no cálculo', async () => {
    await service.registrarPagamento('conta-1', {
      valor: 105, juros: 5, multa: 2, desconto: 2,
      formaPagamento: FormaPagamento.PIX,
    }, usuario);
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        valorJuros: new Prisma.Decimal(5), valorMulta: new Prisma.Decimal(2),
        valorDesconto: new Prisma.Decimal(2), valorAberto: new Prisma.Decimal(0),
      }),
    }));
  });

  it.each([0, -1])('rejeita valor inválido %s sem efeitos', async (valor) => {
    await expect(service.registrarPagamento('conta-1', {
      valor, formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toThrow('valores do pagamento');
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
  });

  it('rejeita pagamento maior que saldo sem efeitos', async () => {
    await expect(service.registrarPagamento('conta-1', {
      valor: 101, formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toThrow('maior que o saldo');
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it('rejeita conta quitada sem nova movimentação', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(conta(StatusContaPagar.PAGA, 0));
    await expect(service.registrarPagamento('conta-1', {
      valor: 1, formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toThrow('já está paga');
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
  });

  it('usa o mesmo tx na saída do Caixa e a empresa da conta', async () => {
    await service.registrarPagamento('conta-1', {
      valor: 20, caixaId: 'caixa-1', formaPagamento: FormaPagamento.PIX,
    }, usuario);
    expect(caixas.registrarMovimentacaoFinanceira).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        caixaId: 'caixa-1', empresaId: 'empresa-1',
        pagamentoContaPagarId: 'pagamento-1',
        valor: new Prisma.Decimal(20),
      }),
    );
    expect(prisma.caixa).toBeUndefined();
  });

  it('propaga falha do Caixa e não atualiza conta ou histórico', async () => {
    caixas.registrarMovimentacaoFinanceira.mockRejectedValue(
      new BadRequestException('Saldo insuficiente no caixa'),
    );
    await expect(service.registrarPagamento('conta-1', {
      valor: 20, caixaId: 'caixa-1', formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toThrow('Saldo insuficiente');
    expect(prisma.contaPagar.update).not.toHaveBeenCalled();
    expect(prisma.contaPagarHistorico.create).not.toHaveBeenCalled();
  });

  it('trata movimentação duplicada e reverte o fluxo', async () => {
    caixas.registrarMovimentacaoFinanceira.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002', clientVersion: '6.19.3',
        meta: { target: ['pagamentoContaPagarId'] },
      }),
    );
    await expect(service.registrarPagamento('conta-1', {
      valor: 20, caixaId: 'caixa-1', formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toThrow('já possui movimentação');
    expect(prisma.contaPagar.update).not.toHaveBeenCalled();
  });

  it('propaga falha do pagamento sem chamar Caixa', async () => {
    const erro = new Error('pagamento falhou');
    prisma.pagamentoContaPagar.create.mockRejectedValue(erro);
    await expect(service.registrarPagamento('conta-1', {
      valor: 20, caixaId: 'caixa-1', formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toBe(erro);
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
  });

  it('propaga falha do histórico após efeitos para rollback transacional', async () => {
    const erro = new Error('histórico falhou');
    prisma.contaPagarHistorico.create.mockRejectedValue(erro);
    await expect(service.registrarPagamento('conta-1', {
      valor: 20, formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toBe(erro);
    expect(prisma.contaPagar.update).toHaveBeenCalled();
  });

  it('impede pagamento de outro tenant antes de efeitos', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue({ ...conta(), empresaId: 'empresa-2' });
    await expect(service.registrarPagamento('conta-1', {
      valor: 20, formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN usa empresa da própria conta no Caixa', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue({ ...conta(), empresaId: 'empresa-2' });
    await service.registrarPagamento('conta-1', {
      valor: 20, caixaId: 'caixa-1', formaPagamento: FormaPagamento.PIX,
    }, { id: 'super', tipo: 'SUPER_ADMIN' });
    expect(caixas.registrarMovimentacaoFinanceira).toHaveBeenCalledWith(
      prisma, expect.objectContaining({ empresaId: 'empresa-2' }),
    );
  });

  it('cancela condicionalmente e registra histórico', async () => {
    await service.cancelar('conta-1', usuario);
    expect(prisma.contaPagar.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ empresaId: 'empresa-1', pagamentos: { none: {} } }),
    }));
    expect(prisma.contaPagarHistorico.create).toHaveBeenCalled();
  });

  it('bloqueia cancelamento com pagamentos', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue({
      ...conta(), pagamentos: [{ id: 'pagamento-1' }],
    });
    await expect(service.cancelar('conta-1', usuario)).rejects.toThrow('com pagamentos');
    expect(prisma.contaPagar.updateMany).not.toHaveBeenCalled();
  });

  it('rejeita perdedor concorrente do cancelamento sem histórico', async () => {
    prisma.contaPagar.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancelar('conta-1', usuario)).rejects.toThrow('foi alterada');
    expect(prisma.contaPagarHistorico.create).not.toHaveBeenCalled();
  });

  it('cancelamento repetido permanece idempotente', async () => {
    const cancelada = conta(StatusContaPagar.CANCELADA);
    prisma.contaPagar.findUnique.mockResolvedValue(cancelada);
    await expect(service.cancelar('conta-1', usuario)).resolves.toBe(cancelada);
    expect(prisma.contaPagar.updateMany).not.toHaveBeenCalled();
  });
  it('mantém saldo de um centavo como pagamento parcial', async () => {
    await service.registrarPagamento('conta-1', {
      valor: 99.99, formaPagamento: FormaPagamento.PIX,
    }, usuario);
    expect(prisma.contaPagar.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        valorAberto: new Prisma.Decimal('0.01'),
        status: StatusContaPagar.PARCIALMENTE_PAGA,
      }),
    }));
  });

  it.each([
    ['valor', { valor: 10.001 }],
    ['juros', { valor: 10, juros: 0.009 }],
    ['multa', { valor: 10, multa: 1.999 }],
    ['desconto', { valor: 10, desconto: 99.995 }],
  ])('rejeita precisão inválida em %s antes dos efeitos financeiros', async (_campo, valores) => {
    await expect(service.registrarPagamento('conta-1', {
      ...valores, formaPagamento: FormaPagamento.PIX,
    }, usuario)).rejects.toThrow('duas casas decimais');
    expect(prisma.pagamentoContaPagar.create).not.toHaveBeenCalled();
    expect(caixas.registrarMovimentacaoFinanceira).not.toHaveBeenCalled();
    expect(prisma.contaPagar.update).not.toHaveBeenCalled();
  });

  it('rejeita precisão inválida na criação sem persistir', async () => {
    await expect(service.criar({
      descricao: 'Conta', dataVencimento: '2026-08-10', valorOriginal: 10.001,
    }, usuario)).rejects.toThrow('duas casas decimais');
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });

  it('rejeita precisão inválida na edição sem persistir', async () => {
    await expect(service.atualizar('conta-1', { valorOriginal: 10.001 }, usuario))
      .rejects.toThrow('duas casas decimais');
    expect(prisma.contaPagar.update).not.toHaveBeenCalled();
  });

  it('rejeita valor interno de pedido com precisão superior a centavos', async () => {
    prisma.contaPagar.findUnique.mockResolvedValue(null);
    prisma.pedidoCompra.findUnique.mockResolvedValue({
      ...pedido, valorTotal: new Prisma.Decimal('100.001'),
    });
    await expect(service.gerarAPartirPedidoCompra('pedido-1', {
      dataVencimento: '2026-08-10',
    }, usuario)).rejects.toThrow('duas casas decimais');
    expect(prisma.contaPagar.create).not.toHaveBeenCalled();
  });
});
