import { Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/services/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecoveryService } from './recovery.service';

const IP = '203.0.113.10';
const EMPRESA_A = 'empresa-a';
const EMPRESA_B = 'empresa-b';
const ATOR_SUPER = 'ator-super';
const ATOR_ADMIN = 'ator-admin';
const ALVO = 'alvo';

type TipoUsuario = 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA';

type UsuarioFake = {
  id: string;
  email: string;
  ativo: boolean;
  empresaId: string | null;
  tipo: TipoUsuario;
  senha: string;
  versaoAutorizacao: number;
};

type LinhaToken = {
  id: string;
  userId: string;
  tokenHash: string | null;
  expiresAt: Date | null;
  usedAt: Date | null;
  pendingTokenHash: string | null;
  pendingExpiresAt: Date | null;
  pendingRequestId: string | null;
  pendingCreatedAt: Date | null;
};

type ArgsUpsert = {
  where: { userId: string };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type ArgsUpdateMany = {
  where: { userId?: string; pendingRequestId?: string };
  data: Partial<LinhaToken>;
};

interface TxFake {
  $queryRaw(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<unknown[]>;
  passwordResetToken: {
    upsert(args: ArgsUpsert): Promise<LinhaToken>;
    updateMany(args: ArgsUpdateMany): Promise<{ count: number }>;
  };
  auditoriaLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

function criarUsuario(
  dados: Partial<UsuarioFake> & Pick<UsuarioFake, 'id'>,
): UsuarioFake {
  return {
    email: `${dados.id}@example.invalid`,
    ativo: true,
    empresaId: EMPRESA_A,
    tipo: 'USUARIO_EMPRESA',
    senha: 'senha-original',
    versaoAutorizacao: 0,
    ...dados,
  };
}

function criarLinhaAtiva(
  userId: string,
  rawToken: string,
  expiresAt: Date,
): LinhaToken {
  return {
    id: `token-${userId}`,
    userId,
    tokenHash: sha256(rawToken),
    expiresAt,
    usedAt: null,
    pendingTokenHash: null,
    pendingExpiresAt: null,
    pendingRequestId: null,
    pendingCreatedAt: null,
  };
}

function criarDeferred<T>() {
  const controle: {
    resolver: (valor: T | PromiseLike<T>) => void;
    rejeitar: (motivo?: unknown) => void;
  } = {
    resolver: () => undefined,
    rejeitar: () => undefined,
  };

  const promessa = new Promise<T>((resolve, reject) => {
    controle.resolver = resolve;
    controle.rejeitar = reject;
  });

  return { promessa, ...controle };
}

class BancoFake {
  readonly usuarios = new Map<string, UsuarioFake>();
  readonly tokens = new Map<string, LinhaToken>();
  readonly auditorias: Record<string, unknown>[] = [];
  readonly eventos: string[] = [];
  readonly ordem: string[] = [];
  readonly upserts: ArgsUpsert[] = [];
  readonly updatesMany: ArgsUpdateMany[] = [];

  falharReserva?: Error;
  falharPromocao?: Error;
  falharCancelamento?: Error;
  falharAuditoria?: Error;

  transacoesConfirmadas = 0;
  transacoesRevertidas = 0;

  private proximoTokenId = 1;

  adicionarUsuario(usuario: UsuarioFake): void {
    this.usuarios.set(usuario.id, usuario);
  }

  async executarTransacao<T>(callback: (tx: TxFake) => Promise<T>): Promise<T> {
    this.eventos.push('inicio-transacao');
    const snapshot = this.criarSnapshot();

    try {
      const resultado = await callback(this.criarTx());
      this.transacoesConfirmadas += 1;
      return resultado;
    } catch (erro) {
      this.restaurarSnapshot(snapshot);
      this.transacoesRevertidas += 1;
      throw erro;
    } finally {
      this.eventos.push('fim-transacao');
    }
  }

  private criarSnapshot(): {
    tokens: LinhaToken[];
    auditorias: number;
  } {
    return {
      tokens: [...this.tokens.values()].map((linha) => ({ ...linha })),
      auditorias: this.auditorias.length,
    };
  }

  private restaurarSnapshot(snapshot: {
    tokens: LinhaToken[];
    auditorias: number;
  }): void {
    this.tokens.clear();

    for (const linha of snapshot.tokens) {
      this.tokens.set(linha.userId, linha);
    }

    this.auditorias.length = snapshot.auditorias;
  }

  private criarTx(): TxFake {
    return {
      $queryRaw: async (
        strings: TemplateStringsArray,
        ...values: unknown[]
      ): Promise<unknown[]> => {
        await Promise.resolve();
        const sql = strings.join('?');

        if (sql.includes('FROM "Usuario"')) {
          this.ordem.push('lock-usuario');
          const id = String(values[0]);
          return this.usuarios.has(id) ? [{ id }] : [];
        }

        if (sql.includes('FROM "PasswordResetToken"')) {
          this.ordem.push('lock-token-pendente');
          const userId = String(values[0]);
          const linha = this.tokens.get(userId);

          if (!linha) {
            return [];
          }

          return [
            {
              id: linha.id,
              pendingTokenHash: linha.pendingTokenHash,
              pendingExpiresAt: linha.pendingExpiresAt,
              pendingRequestId: linha.pendingRequestId,
            },
          ];
        }

        throw new Error(`Consulta não suportada pelo fake: ${sql}`);
      },

      passwordResetToken: {
        upsert: async (args: ArgsUpsert): Promise<LinhaToken> => {
          await Promise.resolve();
          this.ordem.push('upsert');
          this.upserts.push(args);

          if (this.falharReserva) {
            throw this.falharReserva;
          }

          const existente = this.tokens.get(args.where.userId);

          if (existente) {
            Object.assign(existente, args.update);
            return existente;
          }

          const linha: LinhaToken = {
            id: `token-${this.proximoTokenId++}`,
            userId: args.where.userId,
            tokenHash: null,
            expiresAt: null,
            usedAt: null,
            pendingTokenHash: null,
            pendingExpiresAt: null,
            pendingRequestId: null,
            pendingCreatedAt: null,
            ...(args.create as Partial<LinhaToken>),
          };

          this.tokens.set(linha.userId, linha);
          return linha;
        },

        updateMany: async (
          args: ArgsUpdateMany,
        ): Promise<{ count: number }> => {
          await Promise.resolve();
          this.ordem.push('updateMany');
          this.updatesMany.push(args);

          const promovendo = args.data.tokenHash !== undefined;

          if (promovendo && this.falharPromocao) {
            throw this.falharPromocao;
          }

          if (!promovendo && this.falharCancelamento) {
            throw this.falharCancelamento;
          }

          let count = 0;

          for (const linha of this.tokens.values()) {
            if (
              args.where.userId !== undefined &&
              linha.userId !== args.where.userId
            ) {
              continue;
            }

            if (
              args.where.pendingRequestId !== undefined &&
              linha.pendingRequestId !== args.where.pendingRequestId
            ) {
              continue;
            }

            Object.assign(linha, args.data);
            count += 1;
          }

          return { count };
        },
      },

      auditoriaLog: {
        create: async (args: {
          data: Record<string, unknown>;
        }): Promise<{ id: string }> => {
          await Promise.resolve();
          this.ordem.push('auditoria');
          this.eventos.push('auditoria');

          if (this.falharAuditoria) {
            throw this.falharAuditoria;
          }

          this.auditorias.push(args.data);
          return { id: `auditoria-${this.auditorias.length}` };
        },
      },
    };
  }
}

function criarContexto() {
  const banco = new BancoFake();

  const enviarEmail = jest.fn<Promise<void>, [string, string]>();
  enviarEmail.mockResolvedValue(undefined);

  const registrarAuditoria = jest.fn<
    Promise<{ id: string }>,
    [Record<string, unknown>]
  >();
  registrarAuditoria.mockResolvedValue({ id: 'auditoria-1' });

  const prisma = {
    usuario: {
      findUnique: (args: { where: { id: string } }) =>
        Promise.resolve(banco.usuarios.get(args.where.id) ?? null),
    },
    $transaction: <T>(callback: (tx: TxFake) => Promise<T>) =>
      banco.executarTransacao(callback),
  };

  const service = new RecoveryService(
    prisma as unknown as PrismaService,
    {
      sendPasswordResetEmail: enviarEmail,
    } as unknown as MailService,
    {
      registrar: registrarAuditoria,
    } as unknown as AuditoriaService,
  );

  const logErro = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  const logAviso = jest
    .spyOn(Logger.prototype, 'warn')
    .mockImplementation(() => undefined);

  return {
    banco,
    service,
    enviarEmail,
    registrarAuditoria,
    logErro,
    logAviso,
  };
}

type Contexto = ReturnType<typeof criarContexto>;

function adicionarAtoresPadrao(contexto: Contexto): void {
  contexto.banco.adicionarUsuario(
    criarUsuario({
      id: ATOR_SUPER,
      email: 'super@example.invalid',
      tipo: 'SUPER_ADMIN',
      empresaId: EMPRESA_A,
    }),
  );
  contexto.banco.adicionarUsuario(
    criarUsuario({
      id: ATOR_ADMIN,
      email: 'admin@example.invalid',
      tipo: 'ADMIN_EMPRESA',
      empresaId: EMPRESA_A,
    }),
  );
  contexto.banco.adicionarUsuario(
    criarUsuario({
      id: ALVO,
      email: 'alvo@example.invalid',
      tipo: 'USUARIO_EMPRESA',
      empresaId: EMPRESA_A,
    }),
  );
}

describe('RecoveryService — solicitação administrativa', () => {
  let contexto: Contexto;

  beforeEach(() => {
    contexto = criarContexto();
    adicionarAtoresPadrao(contexto);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  function obterUsuario(id: string): UsuarioFake {
    const usuario = contexto.banco.usuarios.get(id);

    if (!usuario) {
      throw new Error('Usuário ausente no teste.');
    }

    return usuario;
  }

  function obterLinha(): LinhaToken {
    const linha = contexto.banco.tokens.get(ALVO);

    if (!linha) {
      throw new Error('Linha de token ausente no teste.');
    }

    return linha;
  }

  describe('autorização e isolamento multiempresa', () => {
    it('SUPER_ADMIN solicita para usuário da própria empresa', async () => {
      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).toHaveBeenCalledTimes(1);
      expect(contexto.enviarEmail).toHaveBeenCalledWith(
        'alvo@example.invalid',
        expect.any(String),
      );
      expect(obterLinha().tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(contexto.banco.auditorias).toHaveLength(1);
    });

    it('SUPER_ADMIN solicita para usuário de outra empresa', async () => {
      obterUsuario(ALVO).empresaId = EMPRESA_B;

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).toHaveBeenCalledTimes(1);
      expect(contexto.banco.auditorias[0]).toEqual(
        expect.objectContaining({ empresaId: EMPRESA_B }),
      );
    });

    it('ADMIN_EMPRESA solicita para usuário da própria empresa', async () => {
      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_ADMIN,
        IP,
      );

      expect(contexto.enviarEmail).toHaveBeenCalledTimes(1);
      expect(contexto.banco.auditorias[0]).toEqual(
        expect.objectContaining({
          usuarioId: ATOR_ADMIN,
          entidadeId: ALVO,
          empresaId: EMPRESA_A,
        }),
      );
    });

    it('ADMIN_EMPRESA não atinge usuário de outra empresa', async () => {
      obterUsuario(ALVO).empresaId = EMPRESA_B;

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_ADMIN,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.eventos).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('ADMIN_EMPRESA não atinge SUPER_ADMIN', async () => {
      obterUsuario(ALVO).tipo = 'SUPER_ADMIN';
      obterUsuario(ALVO).empresaId = EMPRESA_A;

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_ADMIN,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('ADMIN_EMPRESA não atinge usuário sem empresa', async () => {
      obterUsuario(ALVO).empresaId = null;

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_ADMIN,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('ADMIN_EMPRESA sem empresa vinculada é bloqueado', async () => {
      obterUsuario(ATOR_ADMIN).empresaId = null;

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_ADMIN,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('bloqueia solicitante inexistente', async () => {
      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        'ator-inexistente',
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('bloqueia solicitante inativo', async () => {
      obterUsuario(ATOR_SUPER).ativo = false;

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('bloqueia perfil não autorizado', async () => {
      obterUsuario(ATOR_SUPER).tipo = 'USUARIO_EMPRESA';

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('bloqueia usuário-alvo inexistente', async () => {
      await contexto.service.solicitarRedefinicaoAdministrativa(
        'alvo-inexistente',
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('bloqueia usuário-alvo inativo', async () => {
      obterUsuario(ALVO).ativo = false;

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('bloqueia usuário-alvo sem e-mail utilizável', async () => {
      obterUsuario(ALVO).email = '   ';

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.tokens.size).toBe(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });
  });

  describe('fluxo seguro de recuperação', () => {
    it('reserva a pendência já com o hash e envia o token fora da transação', async () => {
      let tokenEnviado = '';
      let estadoNoEnvio:
        | { tokenHash: string | null; pendingTokenHash: string | null }
        | undefined;

      contexto.enviarEmail.mockImplementation((_email, token) => {
        tokenEnviado = token;
        const linha = obterLinha();
        estadoNoEnvio = {
          tokenHash: linha.tokenHash,
          pendingTokenHash: linha.pendingTokenHash,
        };
        return Promise.resolve();
      });

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      const upsert = contexto.banco.upserts[0];

      expect(upsert.create.pendingTokenHash).toBe(sha256(tokenEnviado));
      expect(upsert.create).not.toHaveProperty('tokenHash');
      expect(upsert.create).not.toHaveProperty('expiresAt');
      expect(estadoNoEnvio?.tokenHash).toBeNull();
      expect(estadoNoEnvio?.pendingTokenHash).toBe(sha256(tokenEnviado));
      expect(contexto.banco.updatesMany).toHaveLength(1);
    });

    it('executa o SMTP fora das transações e promove somente após o sucesso', async () => {
      let eventosNoEnvio: string[] = [];

      contexto.enviarEmail.mockImplementation(() => {
        eventosNoEnvio = [...contexto.banco.eventos];
        return Promise.resolve();
      });

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(eventosNoEnvio).toEqual(['inicio-transacao', 'fim-transacao']);

      const linha = obterLinha();
      expect(linha.tokenHash).not.toBeNull();
      expect(linha.pendingTokenHash).toBeNull();
      expect(linha.pendingExpiresAt).toBeNull();
      expect(linha.pendingRequestId).toBeNull();
      expect(linha.pendingCreatedAt).toBeNull();
    });

    it('usa o e-mail persistido canonicalizado', async () => {
      obterUsuario(ALVO).email = '  ALVO@Example.COM  ';

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.enviarEmail).toHaveBeenCalledWith(
        'alvo@example.com',
        expect.any(String),
      );
    });

    it('falha SMTP cancela somente a própria pendência e preserva o token ativo', async () => {
      contexto.banco.tokens.set(
        ALVO,
        criarLinhaAtiva(
          ALVO,
          'token-ativo-anterior',
          new Date(Date.now() + 60_000),
        ),
      );
      const ativoAntes = { ...obterLinha() };

      contexto.enviarEmail.mockRejectedValueOnce(
        new Error('SMTP indisponível'),
      );

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      const linha = obterLinha();
      expect(linha.tokenHash).toBe(ativoAntes.tokenHash);
      expect(linha.expiresAt).toEqual(ativoAntes.expiresAt);
      expect(linha.pendingTokenHash).toBeNull();
      expect(contexto.banco.auditorias).toHaveLength(0);

      const cancelamento = contexto.banco.updatesMany.find(
        (atualizacao) => atualizacao.data.tokenHash === undefined,
      );
      expect(cancelamento?.where.userId).toBe(ALVO);
      expect(cancelamento?.where.pendingRequestId).toEqual(expect.any(String));
    });

    it('falha SMTP não cancela a pendência de uma solicitação mais recente', async () => {
      const smtpA = criarDeferred<void>();
      const smtpB = criarDeferred<void>();
      const chegouA = criarDeferred<void>();
      const chegouB = criarDeferred<void>();
      let chamadas = 0;

      contexto.enviarEmail.mockImplementation(() => {
        chamadas += 1;

        if (chamadas === 1) {
          chegouA.resolver();
          return smtpA.promessa;
        }

        chegouB.resolver();
        return smtpB.promessa;
      });

      const solicitacaoA = contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );
      await chegouA.promessa;

      const solicitacaoB = contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );
      await chegouB.promessa;

      const pendenciaB = obterLinha().pendingRequestId;
      expect(pendenciaB).toEqual(expect.any(String));

      smtpA.rejeitar(new Error('SMTP A'));
      await solicitacaoA;

      expect(obterLinha().pendingRequestId).toBe(pendenciaB);
      expect(contexto.banco.auditorias).toHaveLength(0);

      smtpB.resolver();
      await solicitacaoB;

      expect(obterLinha().tokenHash).not.toBeNull();
      expect(obterLinha().pendingRequestId).toBeNull();
    });

    it('falha na promoção não audita e preserva o token ativo', async () => {
      contexto.banco.tokens.set(
        ALVO,
        criarLinhaAtiva(
          ALVO,
          'token-ativo-anterior',
          new Date(Date.now() + 60_000),
        ),
      );
      const ativoAntes = { ...obterLinha() };
      contexto.banco.falharPromocao = new Error('falha de promoção');

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      const linha = obterLinha();
      expect(linha.tokenHash).toBe(ativoAntes.tokenHash);
      expect(linha.expiresAt).toEqual(ativoAntes.expiresAt);
      expect(linha.pendingTokenHash).not.toBeNull();
      expect(contexto.banco.transacoesRevertidas).toBeGreaterThanOrEqual(1);
      expect(contexto.banco.auditorias).toHaveLength(0);
      expect(contexto.logErro).toHaveBeenCalledWith(
        expect.stringContaining(
          'Falha ao promover a solicitação administrativa',
        ),
      );
    });

    it('falha na reserva não envia e-mail nem audita', async () => {
      contexto.banco.falharReserva = new Error('falha de reserva');

      await expect(
        contexto.service.solicitarRedefinicaoAdministrativa(
          ALVO,
          ATOR_SUPER,
          IP,
        ),
      ).rejects.toThrow('falha de reserva');

      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.auditorias).toHaveLength(0);
    });
  });

  describe('auditoria', () => {
    it('registra ator, alvo, empresa, IP e ação sem segredos', async () => {
      let tokenEnviado = '';

      contexto.enviarEmail.mockImplementation((_email, token) => {
        tokenEnviado = token;
        return Promise.resolve();
      });

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.banco.auditorias).toHaveLength(1);
      expect(contexto.banco.auditorias[0]).toEqual(
        expect.objectContaining({
          acao: 'SOLICITACAO_RECUPERACAO_SENHA_ADMIN',
          entidade: 'Usuario',
          entidadeId: ALVO,
          empresaId: EMPRESA_A,
          usuarioId: ATOR_SUPER,
          ip: IP,
        }),
      );

      const auditoria = JSON.stringify(contexto.banco.auditorias);
      const logs = JSON.stringify(contexto.logErro.mock.calls);

      for (const segredo of [
        tokenEnviado,
        sha256(tokenEnviado),
        'senha-original',
      ]) {
        expect(auditoria).not.toContain(segredo);
        expect(logs).not.toContain(segredo);
      }

      expect(auditoria).not.toContain('alvo@example.invalid');
    });

    it('não audita quando o SMTP falha', async () => {
      contexto.enviarEmail.mockRejectedValueOnce(new Error('SMTP offline'));

      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('grava a auditoria dentro da transação de promoção', async () => {
      await contexto.service.solicitarRedefinicaoAdministrativa(
        ALVO,
        ATOR_SUPER,
        IP,
      );

      expect(contexto.banco.eventos).toEqual([
        'inicio-transacao',
        'fim-transacao',
        'inicio-transacao',
        'auditoria',
        'fim-transacao',
      ]);
      expect(contexto.banco.transacoesConfirmadas).toBe(2);
      expect(contexto.banco.auditorias).toHaveLength(1);
    });

    it('falha da auditoria reverte a promoção e preserva o token ativo anterior', async () => {
      contexto.banco.tokens.set(
        ALVO,
        criarLinhaAtiva(
          ALVO,
          'token-ativo-anterior',
          new Date(Date.now() + 60_000),
        ),
      );
      const ativoAntes = { ...obterLinha() };
      contexto.banco.falharAuditoria = new Error('auditoria offline');

      await expect(
        contexto.service.solicitarRedefinicaoAdministrativa(
          ALVO,
          ATOR_SUPER,
          IP,
        ),
      ).resolves.toBeUndefined();

      const linha = obterLinha();
      expect(linha.tokenHash).toBe(ativoAntes.tokenHash);
      expect(linha.expiresAt).toEqual(ativoAntes.expiresAt);
      expect(linha.pendingTokenHash).not.toBeNull();
      expect(contexto.banco.auditorias).toHaveLength(0);
      expect(contexto.banco.transacoesRevertidas).toBeGreaterThanOrEqual(1);
      expect(contexto.logErro).toHaveBeenCalledWith(
        expect.stringContaining(
          'Falha ao promover a solicitação administrativa',
        ),
      );
    });

    it('falha da auditoria sem token ativo mantém a pendência para nova tentativa', async () => {
      contexto.banco.falharAuditoria = new Error('auditoria offline');

      await expect(
        contexto.service.solicitarRedefinicaoAdministrativa(
          ALVO,
          ATOR_SUPER,
          IP,
        ),
      ).resolves.toBeUndefined();

      const linha = obterLinha();
      expect(linha.tokenHash).toBeNull();
      expect(linha.pendingTokenHash).not.toBeNull();
      expect(linha.pendingRequestId).not.toBeNull();
      expect(contexto.banco.auditorias).toHaveLength(0);
    });
  });
});
