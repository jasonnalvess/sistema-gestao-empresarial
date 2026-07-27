import { FormaRecebimento } from '@prisma/client';
import { validate } from 'class-validator';
import { AtualizarContaReceberDto } from './atualizar-conta-receber.dto';
import { CriarContaReceberDto } from './criar-conta-receber.dto';
import { GerarContaOrdemServicoDto } from './gerar-conta-ordem-servico.dto';
import { RegistrarRecebimentoContaReceberDto } from './registrar-recebimento-conta-receber.dto';

describe('validação monetária dos DTOs de Contas a Receber', () => {
  it.each([10, 10.1, 10.1, 0.01])('aceita valor válido %s', async (valor) => {
    const dto = Object.assign(new RegistrarRecebimentoContaReceberDto(), {
      valor,
      formaRecebimento: FormaRecebimento.PIX,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([10.001, 99.995, 0.009, 1.999])(
    'rejeita mais de duas casas em %s',
    async (valor) => {
      const dto = Object.assign(new RegistrarRecebimentoContaReceberDto(), {
        valor,
        formaRecebimento: FormaRecebimento.PIX,
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it.each([0, -1])('rejeita recebimento não positivo %s', async (valor) => {
    const dto = Object.assign(new RegistrarRecebimentoContaReceberDto(), {
      valor,
      formaRecebimento: FormaRecebimento.PIX,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it.each(['desconto', 'juros', 'multa'] as const)(
    'rejeita precisão inválida em %s',
    async (campo) => {
      const dto = Object.assign(new RegistrarRecebimentoContaReceberDto(), {
        valor: 10,
        formaRecebimento: FormaRecebimento.PIX,
        [campo]: 0.001,
      });
      expect(await validate(dto)).not.toHaveLength(0);
    },
  );

  it('mantém string decimal fora do contrato numérico', async () => {
    const dto = Object.assign(new RegistrarRecebimentoContaReceberDto(), {
      valor: '10.10',
      formaRecebimento: FormaRecebimento.PIX,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('aplica a mesma precisão na criação, edição e geração por ordem', async () => {
    const criacao = Object.assign(new CriarContaReceberDto(), {
      descricao: 'Conta',
      dataVencimento: '2026-08-10',
      valorOriginal: 10.001,
    });
    const edicao = Object.assign(new AtualizarContaReceberDto(), {
      valorOriginal: 10.001,
    });
    const ordem = Object.assign(new GerarContaOrdemServicoDto(), {
      dataVencimento: '2026-08-10',
      valorOriginal: 10.001,
    });
    expect(await validate(criacao)).not.toHaveLength(0);
    expect(await validate(edicao)).not.toHaveLength(0);
    expect(await validate(ordem)).not.toHaveLength(0);
  });
});
