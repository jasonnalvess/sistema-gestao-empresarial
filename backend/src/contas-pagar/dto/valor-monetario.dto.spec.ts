import { FormaPagamento } from '@prisma/client';
import { validate } from 'class-validator';
import { AtualizarContaPagarDto } from './atualizar-conta-pagar.dto';
import { CriarContaPagarDto } from './criar-conta-pagar.dto';
import { RegistrarPagamentoContaPagarDto } from './registrar-pagamento-conta-pagar.dto';

describe('validação monetária dos DTOs de Contas a Pagar', () => {
  it.each([10, 10.1, 10.10, 0.01])('aceita valor monetário válido %s', async (valor) => {
    const dto = Object.assign(new RegistrarPagamentoContaPagarDto(), {
      valor,
      formaPagamento: FormaPagamento.PIX,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([10.001, 99.995, 0.009, 1.999])('rejeita valor com mais de duas casas %s', async (valor) => {
    const dto = Object.assign(new RegistrarPagamentoContaPagarDto(), {
      valor,
      formaPagamento: FormaPagamento.PIX,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it.each([0, -1])('rejeita valor de pagamento não positivo %s', async (valor) => {
    const dto = Object.assign(new RegistrarPagamentoContaPagarDto(), {
      valor,
      formaPagamento: FormaPagamento.PIX,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('mantém string decimal fora do contrato numérico atual', async () => {
    const dto = Object.assign(new RegistrarPagamentoContaPagarDto(), {
      valor: '10.10',
      formaPagamento: FormaPagamento.PIX,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it.each(['desconto', 'juros', 'multa'] as const)(
    'rejeita precisão inválida em %s do pagamento',
    async (campo) => {
      const dto = Object.assign(new RegistrarPagamentoContaPagarDto(), {
        valor: 10,
        formaPagamento: FormaPagamento.PIX,
        [campo]: 0.001,
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('valida precisão na criação e na edição', async () => {
    const criacaoValida = Object.assign(new CriarContaPagarDto(), {
      descricao: 'Conta', dataVencimento: '2026-08-10', valorOriginal: 10.1,
    });
    const criacaoInvalida = Object.assign(new CriarContaPagarDto(), {
      descricao: 'Conta', dataVencimento: '2026-08-10', valorOriginal: 10.001,
    });
    const edicaoValida = Object.assign(new AtualizarContaPagarDto(), {
      valorOriginal: 99.99,
    });
    const edicaoInvalida = Object.assign(new AtualizarContaPagarDto(), {
      valorOriginal: 99.995,
    });

    await expect(validate(criacaoValida)).resolves.toHaveLength(0);
    expect(await validate(criacaoInvalida)).not.toHaveLength(0);
    await expect(validate(edicaoValida)).resolves.toHaveLength(0);
    expect(await validate(edicaoInvalida)).not.toHaveLength(0);
  });
});
