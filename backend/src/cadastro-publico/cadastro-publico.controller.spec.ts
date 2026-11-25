import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';
import { CadastroPublicoController } from './cadastro-publico.controller';
import {
  CadastroPublicoService,
  ENDPOINT_RATE_LIMIT_CADASTRO,
  ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO,
  LIMITE_CONCLUSAO_CADASTRO,
  LIMITE_SOLICITACOES_CADASTRO,
  MENSAGEM_CONCLUSAO_CADASTRO,
  MENSAGEM_RESPOSTA_CADASTRO_PUBLICO,
} from './cadastro-publico.service';

function criarController() {
  const service = {
    solicitar: jest.fn().mockResolvedValue({
      message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO,
    }),
    reenviar: jest.fn().mockResolvedValue({
      message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO,
    }),
    concluir: jest.fn().mockResolvedValue({
      message: MENSAGEM_CONCLUSAO_CADASTRO,
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
    }),
  };
  const rateLimit = { checkLimit: jest.fn().mockResolvedValue(undefined) };
  const ipUtil = { getRealIp: jest.fn().mockReturnValue('203.0.113.10') };

  const controller = new CadastroPublicoController(
    service as unknown as CadastroPublicoService,
    rateLimit as unknown as RateLimitService,
    ipUtil as unknown as IpUtil,
  );

  return { controller, service, rateLimit, ipUtil };
}

const REQ = {} as Request;

describe('CadastroPublicoController', () => {
  const dadosSolicitacao = {
    nomeEmpresa: 'Empresa Teste',
    nomeResponsavel: 'Fulano de Tal',
    email: 'fulano@exemplo.com',
  };

  it('aplica rate limit 5/15min antes de processar a solicitação', async () => {
    const { controller, service, rateLimit, ipUtil } = criarController();

    await controller.solicitar(dadosSolicitacao, REQ);

    expect(rateLimit.checkLimit).toHaveBeenCalledWith(
      REQ,
      ENDPOINT_RATE_LIMIT_CADASTRO,
      LIMITE_SOLICITACOES_CADASTRO,
    );
    expect(LIMITE_SOLICITACOES_CADASTRO).toBe(5);
    expect(rateLimit.checkLimit.mock.invocationCallOrder[0]).toBeLessThan(
      service.solicitar.mock.invocationCallOrder[0],
    );
    expect(ipUtil.getRealIp).toHaveBeenCalledWith(REQ);
    expect(service.solicitar).toHaveBeenCalledWith(
      dadosSolicitacao,
      '203.0.113.10',
    );
  });

  it('rate limit excedido (fail-closed) impede a solicitação', async () => {
    const { controller, service, rateLimit } = criarController();
    rateLimit.checkLimit.mockRejectedValue(
      new ForbiddenException('Limite de solicitações excedido.'),
    );

    await expect(
      controller.solicitar(dadosSolicitacao, REQ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.solicitar).not.toHaveBeenCalled();
  });

  it('reenvio também é protegido por rate limit e delega ao serviço', async () => {
    const { controller, service, rateLimit } = criarController();

    const resposta = await controller.reenviar(
      { email: 'fulano@exemplo.com' },
      REQ,
    );

    expect(rateLimit.checkLimit).toHaveBeenCalledWith(
      REQ,
      ENDPOINT_RATE_LIMIT_CADASTRO,
      LIMITE_SOLICITACOES_CADASTRO,
    );
    expect(service.reenviar).toHaveBeenCalledWith(
      'fulano@exemplo.com',
      '203.0.113.10',
    );
    expect(resposta).toEqual({ message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO });
  });

  it('reenvio com rate limit excedido não chama o serviço', async () => {
    const { controller, service, rateLimit } = criarController();
    rateLimit.checkLimit.mockRejectedValue(new ForbiddenException());

    await expect(
      controller.reenviar({ email: 'fulano@exemplo.com' }, REQ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.reenviar).not.toHaveBeenCalled();
  });

  it('solicitação e reenvio compartilham exatamente a mesma chave de quota', async () => {
    const { controller, rateLimit } = criarController();

    await controller.solicitar(dadosSolicitacao, REQ);
    await controller.reenviar({ email: 'fulano@exemplo.com' }, REQ);

    const chamadas = rateLimit.checkLimit.mock.calls as unknown as [
      Request,
      string,
      number,
    ][];
    expect(chamadas).toHaveLength(2);
    expect(chamadas[0][1]).toBe(ENDPOINT_RATE_LIMIT_CADASTRO);
    expect(chamadas[1][1]).toBe(ENDPOINT_RATE_LIMIT_CADASTRO);
    expect(chamadas[0][1]).toBe(chamadas[1][1]);
    expect(chamadas[0][2]).toBe(LIMITE_SOLICITACOES_CADASTRO);
    expect(chamadas[1][2]).toBe(LIMITE_SOLICITACOES_CADASTRO);
  });

  describe('conclusão do cadastro (Fase B)', () => {
    const dadosConclusao = {
      token: 'a'.repeat(64),
      senha: 'SenhaForte123',
      confirmarSenha: 'SenhaForte123',
    };

    it('aplica rate limit próprio (5/15min) antes de concluir o cadastro', async () => {
      const { controller, service, rateLimit, ipUtil } = criarController();

      await controller.concluir(dadosConclusao, REQ);

      expect(rateLimit.checkLimit).toHaveBeenCalledWith(
        REQ,
        ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO,
        LIMITE_CONCLUSAO_CADASTRO,
      );
      expect(LIMITE_CONCLUSAO_CADASTRO).toBe(5);
      expect(rateLimit.checkLimit.mock.invocationCallOrder[0]).toBeLessThan(
        service.concluir.mock.invocationCallOrder[0],
      );
      expect(ipUtil.getRealIp).toHaveBeenCalledWith(REQ);
      expect(service.concluir).toHaveBeenCalledWith(
        dadosConclusao,
        '203.0.113.10',
      );
    });

    it('rate limit excedido (fail-closed) impede a conclusão', async () => {
      const { controller, service, rateLimit } = criarController();
      rateLimit.checkLimit.mockRejectedValue(
        new ForbiddenException('Limite de solicitações excedido.'),
      );

      await expect(
        controller.concluir(dadosConclusao, REQ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(service.concluir).not.toHaveBeenCalled();
    });

    it('a quota da conclusão é independente da quota de solicitação/reenvio', () => {
      expect(ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO).not.toBe(
        ENDPOINT_RATE_LIMIT_CADASTRO,
      );
    });
  });

  it('resposta do endpoint é apenas a mensagem genérica', async () => {
    const { controller } = criarController();

    const resposta = await controller.solicitar(dadosSolicitacao, REQ);

    expect(Object.keys(resposta)).toEqual(['message']);
    expect(resposta.message).toBe(MENSAGEM_RESPOSTA_CADASTRO_PUBLICO);
  });
});
