import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  CadastroPublicoService,
  MENSAGEM_RESPOSTA_CADASTRO_PUBLICO,
  TAMANHO_MAXIMO_ERRO_ENVIO,
  VALIDADE_TOKEN_CADASTRO_MS,
  gerarTokenVerificacao,
  hashTokenVerificacao,
  sanitizarErroEnvio,
} from './cadastro-publico.service';

const AGORA = new Date('2026-11-14T12:00:00.000Z');

interface DadosCriacao {
  nomeEmpresa: string;
  cnpjEmpresa: string | null;
  nomeResponsavel: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  estado: string;
}

interface EnvioEmail {
  destinatario: string;
  nomeResponsavel: string;
  nomeEmpresa: string;
  token: string;
}

interface EventoAuditoria {
  acao: string;
  entidade: string;
  entidadeId?: string;
  dadosNovos?: unknown;
  usuarioId?: string;
  ip?: string;
}

interface ArgumentoAtualizacao {
  where: { id: string };
  data: {
    tentativasEnvio?: { increment: number };
    ultimoEnvioEm?: Date;
    ultimoErroEnvio?: string | null;
  };
}

interface ArgumentoAtualizacaoMuitos {
  where: Record<string, unknown>;
  data: { tokenHash: string; expiresAt: Date };
}

function primeiroArgumento<T>(mock: jest.Mock): T {
  const chamadas = mock.mock.calls as unknown as [T][];
  return chamadas[0][0];
}

function totalChamadas(mock: jest.Mock): number {
  return mock.mock.calls.length;
}

function criarLinha(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sol-1',
    nomeEmpresa: 'Empresa Teste',
    cnpjEmpresa: null,
    nomeResponsavel: 'Fulano de Tal',
    email: 'fulano@exemplo.com',
    tokenHash: 'hash-persistido',
    expiresAt: new Date(AGORA.getTime() + VALIDADE_TOKEN_CADASTRO_MS),
    usedAt: null,
    estado: 'PENDENTE',
    tentativasEnvio: 0,
    ultimoEnvioEm: null,
    ultimoErroEnvio: null,
    createdAt: AGORA,
    updatedAt: AGORA,
    ...overrides,
  };
}

function criarService() {
  const criados: DadosCriacao[] = [];
  const envios: EnvioEmail[] = [];
  const eventos: EventoAuditoria[] = [];

  const prisma = {
    solicitacaoCadastro: {
      create: jest.fn().mockImplementation((args: { data: DadosCriacao }) => {
        criados.push(args.data);
        return Promise.resolve(
          criarLinha({ ...args.data, id: `sol-${criados.length}` }),
        );
      }),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest
        .fn()
        .mockImplementation((args: ArgumentoAtualizacao) =>
          Promise.resolve({ ...criarLinha(), ...args.data }),
        ),
      updateMany: jest
        .fn()
        .mockImplementation((args: ArgumentoAtualizacaoMuitos) =>
          Promise.resolve({ count: 1, ...args.data }),
        ),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mail = {
    enviarEmailVerificacaoCadastro: jest
      .fn()
      .mockImplementation((dados: EnvioEmail) => {
        envios.push(dados);
        return Promise.resolve();
      }),
  };

  const auditoria = {
    registrar: jest.fn().mockImplementation((evento: EventoAuditoria) => {
      eventos.push(evento);
      return Promise.resolve({});
    }),
  };

  const service = new CadastroPublicoService(
    prisma as unknown as PrismaService,
    mail as unknown as MailService,
    auditoria as unknown as AuditoriaService,
  );

  return { service, prisma, mail, auditoria, criados, envios, eventos };
}

const DADOS_SOLICITACAO = {
  nomeEmpresa: ' Empresa Teste ',
  nomeResponsavel: ' Fulano de Tal ',
  email: ' Fulano@Exemplo.com ',
};

describe('CadastroPublicoService — Fase A', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(AGORA);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('token de verificação', () => {
    it('gera token com 32 bytes (64 hex) e persiste apenas o SHA-256', () => {
      const { tokenBruto, tokenHash } = gerarTokenVerificacao();

      expect(tokenBruto).toMatch(/^[a-f0-9]{64}$/);
      expect(tokenHash).toBe(
        createHash('sha256').update(tokenBruto).digest('hex'),
      );
      expect(tokenHash).not.toBe(tokenBruto);
    });

    it('gera tokens distintos a cada chamada (entropia)', () => {
      const tokens = new Set(
        Array.from({ length: 50 }, () => gerarTokenVerificacao().tokenBruto),
      );
      expect(tokens.size).toBe(50);
    });

    it('hashTokenVerificacao é determinístico e nunca devolve o token', () => {
      const token = 'a'.repeat(64);
      const hash = hashTokenVerificacao(token);

      expect(hash).toBe(hashTokenVerificacao(token));
      expect(hash).not.toContain(token);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('solicitar (Fase A)', () => {
    it('persiste solicitação PENDENTE com expiração de exatamente 24 horas', async () => {
      const { service, criados, envios } = criarService();

      await service.solicitar(DADOS_SOLICITACAO);

      expect(criados).toHaveLength(1);
      const criado = criados[0];

      expect(criado.estado).toBe('PENDENTE');
      expect(criado.email).toBe('fulano@exemplo.com');
      expect(criado.nomeEmpresa).toBe('Empresa Teste');
      expect(criado.nomeResponsavel).toBe('Fulano de Tal');
      expect(criado.expiresAt.getTime() - AGORA.getTime()).toBe(
        VALIDADE_TOKEN_CADASTRO_MS,
      );

      // Nunca persiste o token em texto puro nem senha nesta fase.
      expect(Object.keys(criado)).not.toContain('senha');
      const serializado = JSON.stringify(criado);
      expect(serializado).not.toContain(envios[0].token);
      expect(criado.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(criado.tokenHash).toBe(
        createHash('sha256').update(envios[0].token).digest('hex'),
      );
    });

    it('envia e-mail com o token bruto e os dados da empresa (SMTP fora da transação)', async () => {
      const { service, prisma, envios } = criarService();

      await service.solicitar(DADOS_SOLICITACAO);

      expect(envios).toHaveLength(1);
      expect(envios[0]).toMatchObject({
        destinatario: 'fulano@exemplo.com',
        nomeEmpresa: 'Empresa Teste',
        nomeResponsavel: 'Fulano de Tal',
      });
      expect(envios[0].token).toMatch(/^[a-f0-9]{64}$/);

      // Registro de tentativa de envio (sucesso: sem erro).
      const atualizacao = primeiroArgumento<ArgumentoAtualizacao>(
        prisma.solicitacaoCadastro.update,
      );
      expect(atualizacao.where).toEqual({ id: 'sol-1' });
      expect(atualizacao.data.tentativasEnvio).toEqual({ increment: 1 });
      expect(atualizacao.data.ultimoErroEnvio).toBeNull();
    });

    it('não cria empresa, usuário, vínculo de módulo ou trial nesta fase', async () => {
      const { service, prisma } = criarService();

      await service.solicitar(DADOS_SOLICITACAO);

      expect(Object.keys(prisma as unknown as Record<string, unknown>)).toEqual(
        ['solicitacaoCadastro'],
      );
    });

    it('resposta é genérica e não expõe dados internos da solicitação', async () => {
      const { service } = criarService();

      const resposta = await service.solicitar(DADOS_SOLICITACAO);

      expect(resposta).toEqual({ message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO });
      const serializado = JSON.stringify(resposta);
      expect(serializado).not.toContain('sol-1');
      expect(serializado).not.toContain('fulano@exemplo.com');
      expect(serializado).not.toContain('token');
    });

    it('mesma resposta para e-mail já existente ou novo (anti-enumeração)', async () => {
      const { service } = criarService();

      const primeira = await service.solicitar({
        ...DADOS_SOLICITACAO,
        email: 'existente@exemplo.com',
      });
      const segunda = await service.solicitar({
        ...DADOS_SOLICITACAO,
        email: 'novo@exemplo.com',
      });

      expect(primeira).toEqual(segunda);
    });

    it('regenera o token em colisão de hash (P2002) e persiste na tentativa seguinte', async () => {
      const { service, prisma, criados } = criarService();
      prisma.solicitacaoCadastro.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('duplicado', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );

      await service.solicitar(DADOS_SOLICITACAO);

      expect(totalChamadas(prisma.solicitacaoCadastro.create)).toBe(2);
      expect(criados).toHaveLength(1);
    });

    it('propaga erro não relacionado a colisão de hash', async () => {
      const { service, prisma } = criarService();
      prisma.solicitacaoCadastro.create.mockRejectedValueOnce(
        new Error('banco indisponível'),
      );

      await expect(service.solicitar(DADOS_SOLICITACAO)).rejects.toThrow(
        'banco indisponível',
      );
    });
  });

  describe('falha SMTP (pendência preservada)', () => {
    it('mantém a solicitação, não exclui e não invalida o token', async () => {
      const { service, prisma, mail } = criarService();
      mail.enviarEmailVerificacaoCadastro.mockRejectedValueOnce(
        Object.assign(new Error('conexão recusada'), { code: 'ECONNREFUSED' }),
      );

      const resposta = await service.solicitar(DADOS_SOLICITACAO);

      expect(resposta).toEqual({ message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO });
      expect(prisma.solicitacaoCadastro.delete).not.toHaveBeenCalled();
      expect(prisma.solicitacaoCadastro.deleteMany).not.toHaveBeenCalled();
      // Nenhuma escrita além do registro da tentativa (incremento) — o hash
      // e a validade não são alterados em falha de envio.
      expect(totalChamadas(prisma.solicitacaoCadastro.update)).toBe(1);
      expect(prisma.solicitacaoCadastro.updateMany).not.toHaveBeenCalled();
    });

    it('registra tentativa com erro sanitizado e sem dados sensíveis', async () => {
      const { service, prisma, mail } = criarService();
      mail.enviarEmailVerificacaoCadastro.mockRejectedValueOnce(
        new Error(
          'SMTP recusou para fulano@exemplo.com com token abcdef123456 e senha xyz',
        ),
      );

      await service.solicitar(DADOS_SOLICITACAO);

      const atualizacao = primeiroArgumento<ArgumentoAtualizacao>(
        prisma.solicitacaoCadastro.update,
      );
      const erro = String(atualizacao.data.ultimoErroEnvio);
      expect(erro).toBe('Error');
      expect(erro.length).toBeLessThanOrEqual(TAMANHO_MAXIMO_ERRO_ENVIO);
      expect(erro).not.toContain('fulano@exemplo.com');
      expect(erro).not.toContain('abcdef123456');
    });

    it('sanitizarErroEnvio: código quando presente, nome como fallback, limite de tamanho', () => {
      expect(
        sanitizarErroEnvio(
          Object.assign(new Error('x'), { code: 'EENVELOPE' }),
        ),
      ).toBe('EENVELOPE');
      expect(sanitizarErroEnvio(new TypeError('segredo'))).toBe('TypeError');
      expect(sanitizarErroEnvio('texto solto')).toBe('ERRO_ENVIO_EMAIL');
      expect(sanitizarErroEnvio(null)).toBe('ERRO_ENVIO_EMAIL');

      const gigante = Object.assign(new Error('x'), { code: 'C'.repeat(500) });
      expect(sanitizarErroEnvio(gigante).length).toBe(
        TAMANHO_MAXIMO_ERRO_ENVIO,
      );
    });

    it('falha ao registrar a tentativa não quebra a resposta pública', async () => {
      const { service, prisma, mail } = criarService();
      mail.enviarEmailVerificacaoCadastro.mockRejectedValueOnce(
        new Error('smtp'),
      );
      prisma.solicitacaoCadastro.update.mockRejectedValueOnce(
        new Error('banco'),
      );

      await expect(service.solicitar(DADOS_SOLICITACAO)).resolves.toEqual({
        message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO,
      });
    });
  });

  describe('reenvio', () => {
    it('emite novo token para a pendência e invalida o anterior por substituição', async () => {
      const { service, prisma, envios } = criarService();
      prisma.solicitacaoCadastro.findFirst.mockResolvedValueOnce(criarLinha());

      await service.reenviar('Fulano@Exemplo.com');

      expect(prisma.solicitacaoCadastro.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'fulano@exemplo.com',
          estado: 'PENDENTE',
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      const atualizacao = primeiroArgumento<ArgumentoAtualizacaoMuitos>(
        prisma.solicitacaoCadastro.updateMany,
      );
      expect(atualizacao.where).toEqual({
        id: 'sol-1',
        estado: 'PENDENTE',
        usedAt: null,
      });
      expect(atualizacao.data.tokenHash).not.toBe('hash-persistido');
      expect(atualizacao.data.expiresAt.getTime() - AGORA.getTime()).toBe(
        VALIDADE_TOKEN_CADASTRO_MS,
      );

      expect(envios).toHaveLength(1);
      expect(createHash('sha256').update(envios[0].token).digest('hex')).toBe(
        atualizacao.data.tokenHash,
      );
    });

    it('sem pendência: resposta genérica e nenhum efeito colateral', async () => {
      const { service, prisma, mail } = criarService();
      prisma.solicitacaoCadastro.findFirst.mockResolvedValueOnce(null);

      const resposta = await service.reenviar('ninguem@exemplo.com');

      expect(resposta).toEqual({ message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO });
      expect(prisma.solicitacaoCadastro.updateMany).not.toHaveBeenCalled();
      expect(prisma.solicitacaoCadastro.create).not.toHaveBeenCalled();
      expect(mail.enviarEmailVerificacaoCadastro).not.toHaveBeenCalled();
    });

    it('reenvios concorrentes: apenas quem atualiza a pendência envia e-mail', async () => {
      const { service, prisma, mail } = criarService();
      prisma.solicitacaoCadastro.findFirst.mockResolvedValue(criarLinha());
      prisma.solicitacaoCadastro.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const resultados = await Promise.all([
        service.reenviar('fulano@exemplo.com'),
        service.reenviar('fulano@exemplo.com'),
      ]);

      expect(resultados).toEqual([
        { message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO },
        { message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO },
      ]);
      expect(totalChamadas(prisma.solicitacaoCadastro.updateMany)).toBe(2);
      expect(totalChamadas(mail.enviarEmailVerificacaoCadastro)).toBe(1);
    });

    it('reenvio preserva a pendência em falha SMTP', async () => {
      const { service, prisma, mail } = criarService();
      prisma.solicitacaoCadastro.findFirst.mockResolvedValueOnce(criarLinha());
      mail.enviarEmailVerificacaoCadastro.mockRejectedValueOnce(
        Object.assign(new Error('smtp'), { code: 'ETIMEDOUT' }),
      );

      await expect(service.reenviar('fulano@exemplo.com')).resolves.toEqual({
        message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO,
      });
      expect(prisma.solicitacaoCadastro.delete).not.toHaveBeenCalled();
      expect(
        primeiroArgumento<ArgumentoAtualizacao>(
          prisma.solicitacaoCadastro.update,
        ).data.ultimoErroEnvio,
      ).toBe('ETIMEDOUT');
    });
  });

  describe('validarToken', () => {
    it('token inexistente retorna null', async () => {
      const { service, prisma } = criarService();

      await expect(service.validarToken('inexistente')).resolves.toBeNull();
      expect(prisma.solicitacaoCadastro.findUnique).toHaveBeenCalledWith({
        where: { tokenHash: hashTokenVerificacao('inexistente') },
      });
    });

    it('token expirado retorna null (não pode ser verificado)', async () => {
      const { service, prisma } = criarService();
      prisma.solicitacaoCadastro.findUnique.mockResolvedValueOnce(
        criarLinha({ expiresAt: new Date(AGORA.getTime() - 1) }),
      );

      await expect(service.validarToken('token')).resolves.toBeNull();
    });

    it('token já utilizado ou solicitação concluída retorna null', async () => {
      const { service, prisma } = criarService();
      prisma.solicitacaoCadastro.findUnique.mockResolvedValueOnce(
        criarLinha({ usedAt: AGORA }),
      );
      await expect(service.validarToken('token')).resolves.toBeNull();

      prisma.solicitacaoCadastro.findUnique.mockResolvedValueOnce(
        criarLinha({ estado: 'CONCLUIDA' }),
      );
      await expect(service.validarToken('token')).resolves.toBeNull();
    });

    it('token vazio ou não textual retorna null sem consultar o banco', async () => {
      const { service, prisma } = criarService();

      await expect(service.validarToken('   ')).resolves.toBeNull();
      await expect(
        service.validarToken(undefined as unknown as string),
      ).resolves.toBeNull();
      expect(prisma.solicitacaoCadastro.findUnique).not.toHaveBeenCalled();
    });

    it('token válido retorna os dados necessários à Fase B (sem consumir)', async () => {
      const { service, prisma } = criarService();
      prisma.solicitacaoCadastro.findUnique.mockResolvedValueOnce(criarLinha());

      const validada = await service.validarToken('token-valido');

      expect(validada).toMatchObject({
        id: 'sol-1',
        email: 'fulano@exemplo.com',
        nomeEmpresa: 'Empresa Teste',
        nomeResponsavel: 'Fulano de Tal',
      });
      expect(validada?.expiresAt).toBeInstanceOf(Date);
      expect(prisma.solicitacaoCadastro.update).not.toHaveBeenCalled();
    });
  });

  describe('auditoria', () => {
    it('registra evento do sistema com usuarioId ausente (NULL) e sem token', async () => {
      const { service, eventos } = criarService();

      await service.solicitar(DADOS_SOLICITACAO, '203.0.113.10');

      expect(eventos).toHaveLength(1);
      expect(eventos[0]).toMatchObject({
        acao: 'SOLICITACAO_CADASTRO_PUBLICA',
        entidade: 'SolicitacaoCadastro',
        entidadeId: 'sol-1',
        ip: '203.0.113.10',
      });
      expect(eventos[0].usuarioId).toBeUndefined();
      const serializado = JSON.stringify(eventos[0]);
      expect(serializado).not.toContain('tokenBruto');
      expect(serializado).not.toContain('tokenHash');
    });

    it('falha na auditoria não impede a solicitação', async () => {
      const { service, auditoria } = criarService();
      auditoria.registrar.mockRejectedValueOnce(new Error('auditoria fora'));

      await expect(service.solicitar(DADOS_SOLICITACAO)).resolves.toEqual({
        message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO,
      });
    });

    it('auditoria não loga o token em caso de erro (logger só recebe código)', async () => {
      const espiao = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const { service, auditoria } = criarService();
      auditoria.registrar.mockRejectedValueOnce(
        Object.assign(new Error('token abc123'), { code: 'P2003' }),
      );

      await service.solicitar(DADOS_SOLICITACAO);

      const chamadas = espiao.mock.calls as unknown as [string][];
      const mensagens = chamadas.map(([mensagem]) => String(mensagem));
      expect(mensagens.some((m) => m.includes('P2003'))).toBe(true);
      expect(mensagens.join(' ')).not.toContain('abc123');
    });
  });

  describe('concorrência na criação', () => {
    it('solicitações simultâneas produzem registros e tokens independentes', async () => {
      const { service, criados, envios } = criarService();

      await Promise.all([
        service.solicitar({ ...DADOS_SOLICITACAO, email: 'a@exemplo.com' }),
        service.solicitar({ ...DADOS_SOLICITACAO, email: 'b@exemplo.com' }),
      ]);

      expect(criados).toHaveLength(2);
      expect(new Set(criados.map((c) => c.tokenHash)).size).toBe(2);
      expect(envios).toHaveLength(2);
      expect(new Set(envios.map((e) => e.token)).size).toBe(2);
    });
  });
});
