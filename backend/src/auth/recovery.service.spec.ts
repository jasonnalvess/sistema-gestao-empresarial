import {
  BadRequestException,
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/services/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecoveryService } from './recovery.service';

jest.mock('bcrypt');

const TOKEN = 'token-123';
const NOVA_SENHA = 'NovaSenha123!';
const TOKEN_HASH = sha256(TOKEN);
const IP = '203.0.113.10';
const EMPRESA_ID = 'empresa-1';
const USUARIO_ID = 'user-1';
const EMAIL = 'teste@email.com';

const VALIDADE_ATIVA_MS = 30 * 60 * 1000;
const VALIDADE_PENDENTE_MS = 10 * 60 * 1000;

function sha256(valor: string): string {
  return createHash('sha256').update(valor).digest('hex');
}

type UsuarioFake = {
  id: string;
  email: string;
  ativo: boolean;
  empresaId: string | null;
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
  createdAt: Date;
};

type DadosReservaTeste = {
  tokenHash: string;
  pendingExpiresAt: Date;
  pendingCreatedAt: Date;
  requestId: string;
};

type ArgsUpsert = {
  where: { userId: string };
  create: {
    userId: string;
    pendingTokenHash: string;
    pendingExpiresAt: Date;
    pendingRequestId: string;
    pendingCreatedAt: Date;
  };
  update: {
    pendingTokenHash: string;
    pendingExpiresAt: Date;
    pendingRequestId: string;
    pendingCreatedAt: Date;
  };
};

type ArgsUpdateMany = {
  where: { userId?: string; pendingRequestId?: string };
  data: Partial<LinhaToken>;
};

type ArgsUpdateToken = {
  where: { id: string };
  data: Partial<LinhaToken>;
};

type ArgsUpdateUsuario = {
  where: { id: string };
  data: {
    senha?: string;
    versaoAutorizacao?: { increment: number };
  };
};

interface TxFake {
  $queryRaw(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<unknown[]>;
  passwordResetToken: {
    upsert(args: ArgsUpsert): Promise<LinhaToken>;
    findUnique(args: { where: { id: string } }): Promise<LinhaToken | null>;
    update(args: ArgsUpdateToken): Promise<LinhaToken>;
    updateMany(args: ArgsUpdateMany): Promise<{ count: number }>;
  };
  usuario: {
    findUnique(args: { where: { id: string } }): Promise<UsuarioFake | null>;
    update(args: ArgsUpdateUsuario): Promise<UsuarioFake>;
  };
  auditoriaLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

interface ServicoPrivado {
  reservarPendencia(usuarioId: string, dados: DadosReservaTeste): Promise<void>;
  promoverPendencia(usuarioId: string, requestId: string): Promise<boolean>;
  cancelarPendencia(usuarioId: string, requestId: string): Promise<void>;
}

class BancoFake {
  readonly usuarios = new Map<string, UsuarioFake>();
  readonly tokens = new Map<string, LinhaToken>();
  readonly auditorias: Record<string, unknown>[] = [];
  readonly eventos: string[] = [];
  readonly ordem: string[] = [];
  readonly upserts: ArgsUpsert[] = [];
  readonly updatesMany: ArgsUpdateMany[] = [];
  readonly updatesToken: ArgsUpdateToken[] = [];
  readonly updatesUsuario: ArgsUpdateUsuario[] = [];

  falharReserva?: Error;
  falharPromocao?: Error;
  falharCancelamento?: Error;
  falharAuditoria?: Error;
  aposLeituraDica?: () => void | Promise<void>;
  pausaBloqueioUsuario?: (usuarioId: string) => Promise<void>;
  falhasTransacao?: (Error | undefined)[];

  readonly leiturasDica: string[] = [];

  transacoesConfirmadas = 0;
  transacoesRevertidas = 0;

  private proximoTokenId = 1;

  adicionarUsuario(usuario: UsuarioFake): void {
    this.usuarios.set(usuario.id, usuario);
  }

  adicionarToken(linha: LinhaToken): void {
    this.tokens.set(linha.userId, linha);
  }

  buscarUsuario(where: { email?: string; id?: string }): UsuarioFake | null {
    if (where.email !== undefined) {
      return (
        [...this.usuarios.values()].find(
          (usuario) => usuario.email === where.email,
        ) ?? null
      );
    }

    if (where.id !== undefined) {
      return this.usuarios.get(where.id) ?? null;
    }

    return null;
  }

  async executarTransacao<T>(callback: (tx: TxFake) => Promise<T>): Promise<T> {
    this.eventos.push('inicio-transacao');
    const snapshot = this.criarSnapshot();
    const auditoriasAntes = this.auditorias.length;

    try {
      const resultado = await callback(this.criarTx());
      const falhaTransacao = this.falhasTransacao?.shift();

      if (falhaTransacao) {
        throw falhaTransacao;
      }

      this.transacoesConfirmadas += 1;
      return resultado;
    } catch (erro) {
      this.restaurarSnapshot(snapshot);
      this.auditorias.length = auditoriasAntes;
      this.transacoesRevertidas += 1;
      throw erro;
    } finally {
      this.eventos.push('fim-transacao');
    }
  }

  private criarSnapshot(): {
    tokens: LinhaToken[];
    usuarios: UsuarioFake[];
  } {
    return {
      tokens: [...this.tokens.values()].map((linha) => ({ ...linha })),
      usuarios: [...this.usuarios.values()].map((usuario) => ({ ...usuario })),
    };
  }

  private restaurarSnapshot(snapshot: {
    tokens: LinhaToken[];
    usuarios: UsuarioFake[];
  }): void {
    this.tokens.clear();
    this.usuarios.clear();

    for (const linha of snapshot.tokens) {
      this.tokens.set(linha.userId, linha);
    }

    for (const usuario of snapshot.usuarios) {
      this.usuarios.set(usuario.id, usuario);
    }
  }

  async lerDica(tokenHash: string): Promise<{ userId: string } | null> {
    const linha =
      [...this.tokens.values()].find(
        (token) => token.tokenHash === tokenHash,
      ) ?? null;

    this.leiturasDica.push(tokenHash);

    const resultado = linha ? { userId: linha.userId } : null;
    const aposLeitura = this.aposLeituraDica;

    if (aposLeitura) {
      this.aposLeituraDica = undefined;
      await aposLeitura();
    }

    return resultado;
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
          const pausa = this.pausaBloqueioUsuario;

          if (pausa) {
            this.pausaBloqueioUsuario = undefined;
            await pausa(String(values[0]));
          }

          this.ordem.push('lock-usuario');
          const id = String(values[0]);
          return this.usuarios.has(id) ? [{ id }] : [];
        }

        if (sql.includes('FROM "PasswordResetToken"')) {
          if (sql.includes('WHERE "tokenHash"')) {
            this.ordem.push('lock-token-ativo');
            const hash = String(values[0]);
            const linha = [...this.tokens.values()].find(
              (token) => token.tokenHash === hash,
            );
            return linha ? [{ id: linha.id }] : [];
          }

          if (sql.includes('WHERE "userId"')) {
            const consumo =
              sql.includes('"tokenHash"') || sql.includes('"usedAt"');
            this.ordem.push(
              consumo ? 'lock-token-ativo' : 'lock-token-pendente',
            );
            const userId = String(values[0]);
            const linha = this.tokens.get(userId);

            if (!linha) {
              return [];
            }

            if (consumo) {
              return [
                {
                  id: linha.id,
                  userId: linha.userId,
                  tokenHash: linha.tokenHash,
                  expiresAt: linha.expiresAt,
                  usedAt: linha.usedAt,
                },
              ];
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
            tokenHash: null,
            expiresAt: null,
            usedAt: null,
            createdAt: new Date(),
            ...args.create,
          };

          this.tokens.set(linha.userId, linha);
          return linha;
        },

        findUnique: async (args: {
          where: { id: string };
        }): Promise<LinhaToken | null> => {
          await Promise.resolve();
          return (
            [...this.tokens.values()].find(
              (linha) => linha.id === args.where.id,
            ) ?? null
          );
        },

        update: async (args: ArgsUpdateToken): Promise<LinhaToken> => {
          await Promise.resolve();
          this.ordem.push('update-token');
          this.updatesToken.push(args);

          const linha = [...this.tokens.values()].find(
            (token) => token.id === args.where.id,
          );

          if (!linha) {
            throw new Error('Token inexistente no fake.');
          }

          Object.assign(linha, args.data);
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

      usuario: {
        findUnique: async (args: {
          where: { id: string };
        }): Promise<UsuarioFake | null> => {
          await Promise.resolve();
          return this.usuarios.get(args.where.id) ?? null;
        },

        update: async (args: ArgsUpdateUsuario): Promise<UsuarioFake> => {
          await Promise.resolve();
          this.ordem.push('update-usuario');
          this.updatesUsuario.push(args);

          const usuario = this.usuarios.get(args.where.id);

          if (!usuario) {
            throw new Error('Usuário inexistente no fake.');
          }

          if (args.data.senha !== undefined) {
            usuario.senha = args.data.senha;
          }

          if (args.data.versaoAutorizacao) {
            usuario.versaoAutorizacao += args.data.versaoAutorizacao.increment;
          }

          return usuario;
        },
      },

      auditoriaLog: {
        create: async (args: {
          data: Record<string, unknown>;
        }): Promise<{ id: string }> => {
          await Promise.resolve();
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

function criarUsuario(
  id: string = USUARIO_ID,
  email: string = EMAIL,
): UsuarioFake {
  return {
    id,
    email,
    ativo: true,
    empresaId: EMPRESA_ID,
    senha: 'senha-original',
    versaoAutorizacao: 0,
  };
}

function criarLinhaAtiva(
  userId: string,
  rawToken: string,
  expiresAt: Date,
  usedAt: Date | null = null,
): LinhaToken {
  return {
    id: `token-${userId}`,
    userId,
    tokenHash: sha256(rawToken),
    expiresAt,
    usedAt,
    pendingTokenHash: null,
    pendingExpiresAt: null,
    pendingRequestId: null,
    pendingCreatedAt: null,
    createdAt: new Date(),
  };
}

function criarContexto() {
  const banco = new BancoFake();
  banco.adicionarUsuario(criarUsuario());

  const enviarEmail = jest.fn<Promise<void>, [string, string]>();
  enviarEmail.mockResolvedValue(undefined);

  const registrarAuditoria = jest.fn<
    Promise<{ id: string }>,
    [Record<string, unknown>]
  >();
  registrarAuditoria.mockResolvedValue({ id: 'auditoria-global' });

  const prisma = {
    usuario: {
      findUnique: (args: { where: { email?: string; id?: string } }) =>
        banco.buscarUsuario(args.where),
    },
    passwordResetToken: {
      findUnique: (args: { where: { tokenHash: string } }) =>
        banco.lerDica(args.where.tokenHash),
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

  return {
    banco,
    service,
    enviarEmail,
    registrarAuditoria,
    logErro,
    privado: service as unknown as ServicoPrivado,
  };
}

type Contexto = ReturnType<typeof criarContexto>;

function obterLinha(
  contexto: Contexto,
  userId: string = USUARIO_ID,
): LinhaToken {
  const linha = contexto.banco.tokens.get(userId);

  if (!linha) {
    throw new Error('Linha de token ausente no teste.');
  }

  return linha;
}

function obterUsuario(
  contexto: Contexto,
  userId: string = USUARIO_ID,
): UsuarioFake {
  const usuario = contexto.banco.usuarios.get(userId);

  if (!usuario) {
    throw new Error('Usuário ausente no teste.');
  }

  return usuario;
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

function prepararTokenAtivo(
  contexto: Contexto,
  opcoes: { usado?: boolean; expirado?: boolean } = {},
): void {
  const expiresAt = opcoes.expirado
    ? new Date(Date.now() - 10_000)
    : new Date(Date.now() + 10_000);

  contexto.banco.adicionarToken(
    criarLinhaAtiva(
      USUARIO_ID,
      TOKEN,
      expiresAt,
      opcoes.usado ? new Date() : null,
    ),
  );
}

function criarDadosReserva(
  requestId: string,
  rawToken = 'pendente',
): DadosReservaTeste {
  const agora = new Date();

  return {
    tokenHash: sha256(rawToken),
    pendingExpiresAt: new Date(agora.getTime() + VALIDADE_PENDENTE_MS),
    pendingCreatedAt: agora,
    requestId,
  };
}

function mensagensDeLog(logErro: jest.SpyInstance): string {
  const chamadas = logErro.mock.calls as unknown as unknown[][];
  return chamadas
    .flat()
    .map((valor) => String(valor))
    .join(' ');
}

function erroPrisma(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('conflito', {
    code,
    clientVersion: 'test',
    meta,
  });
}

describe('RecoveryService', () => {
  let contexto: Contexto;

  beforeEach(() => {
    contexto = criarContexto();
    jest.mocked(bcrypt.hash).mockResolvedValue('hash-gerado' as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('solicitarRecuperacao — reserva', () => {
    it('primeira solicitação cria estado pendente sem token ativo', async () => {
      const smtp = criarDeferred<void>();
      const chegouAoSmtp = criarDeferred<void>();

      contexto.enviarEmail.mockImplementation(() => {
        chegouAoSmtp.resolver();
        return smtp.promessa;
      });

      const solicitacao = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouAoSmtp.promessa;

      const linha = obterLinha(contexto);
      expect(linha.tokenHash).toBeNull();
      expect(linha.expiresAt).toBeNull();
      expect(linha.usedAt).toBeNull();
      expect(linha.pendingTokenHash).toEqual(expect.any(String));
      expect(linha.pendingExpiresAt).toBeInstanceOf(Date);
      expect(linha.pendingRequestId).toEqual(expect.any(String));

      smtp.resolver();
      await solicitacao;

      expect(obterLinha(contexto).tokenHash).not.toBeNull();
      expect(obterLinha(contexto).pendingTokenHash).toBeNull();
    });

    it('preserva integralmente o token ativo durante a reserva', async () => {
      prepararTokenAtivo(contexto);
      const ativoAntes = { ...obterLinha(contexto) };

      const smtp = criarDeferred<void>();
      const chegouAoSmtp = criarDeferred<void>();

      contexto.enviarEmail.mockImplementation(() => {
        chegouAoSmtp.resolver();
        return smtp.promessa;
      });

      const solicitacao = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouAoSmtp.promessa;

      const linha = obterLinha(contexto);
      expect(linha.tokenHash).toBe(ativoAntes.tokenHash);
      expect(linha.expiresAt).toEqual(ativoAntes.expiresAt);
      expect(linha.usedAt).toEqual(ativoAntes.usedAt);
      expect(linha.pendingTokenHash).not.toBeNull();

      smtp.resolver();
      await solicitacao;
    });

    it('reserva preenche somente os campos pendentes', async () => {
      const smtp = criarDeferred<void>();
      const chegouAoSmtp = criarDeferred<void>();

      contexto.enviarEmail.mockImplementation(() => {
        chegouAoSmtp.resolver();
        return smtp.promessa;
      });

      const solicitacao = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouAoSmtp.promessa;

      const upsert = contexto.banco.upserts[0];

      expect(Object.keys(upsert.update).sort()).toEqual([
        'pendingCreatedAt',
        'pendingExpiresAt',
        'pendingRequestId',
        'pendingTokenHash',
      ]);
      expect(Object.keys(upsert.create).sort()).toEqual([
        'pendingCreatedAt',
        'pendingExpiresAt',
        'pendingRequestId',
        'pendingTokenHash',
        'userId',
      ]);
      expect(upsert.create).not.toHaveProperty('tokenHash');
      expect(upsert.create).not.toHaveProperty('expiresAt');
      expect(upsert.create).not.toHaveProperty('usedAt');

      smtp.resolver();
      await solicitacao;
    });

    it('reserva mais recente substitui a pendência anterior', async () => {
      const agora = new Date();
      const dados = (indice: number): DadosReservaTeste => ({
        tokenHash: sha256(`token-${indice}`),
        pendingExpiresAt: new Date(agora.getTime() + VALIDADE_PENDENTE_MS),
        pendingCreatedAt: agora,
        requestId: `req-${indice}`,
      });

      await contexto.privado.reservarPendencia(USUARIO_ID, dados(1));
      await contexto.privado.reservarPendencia(USUARIO_ID, dados(2));

      const linha = obterLinha(contexto);
      expect(linha.pendingRequestId).toBe('req-2');
      expect(linha.pendingTokenHash).toBe(sha256('token-2'));
      expect(linha.pendingExpiresAt).toEqual(dados(2).pendingExpiresAt);
    });

    it('bloqueia o usuário antes de manipular a linha de token', async () => {
      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(contexto.banco.ordem.slice(0, 2)).toEqual([
        'lock-usuario',
        'upsert',
      ]);
    });
  });

  describe('solicitarRecuperacao — sucesso SMTP', () => {
    it('executa o SMTP fora das transações e após a reserva', async () => {
      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(contexto.banco.eventos).toEqual([
        'inicio-transacao',
        'fim-transacao',
        'inicio-transacao',
        'fim-transacao',
      ]);
    });

    it('chama o SMTP somente depois de confirmar a reserva e sem transação aberta', async () => {
      let eventosNoEnvio: string[] = [];

      contexto.enviarEmail.mockImplementation(() => {
        eventosNoEnvio = [...contexto.banco.eventos];
        return Promise.resolve();
      });

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(eventosNoEnvio).toEqual(['inicio-transacao', 'fim-transacao']);
      expect(contexto.banco.eventos.slice(0, 2)).toEqual(eventosNoEnvio);
    });

    it('promove somente depois que o SMTP resolve com sucesso', async () => {
      prepararTokenAtivo(contexto);
      const ativoAntes = { ...obterLinha(contexto) };
      let estadoNoEnvio:
        | { tokenHash: string | null; pendingTokenHash: string | null }
        | undefined;

      contexto.enviarEmail.mockImplementation(() => {
        const linha = obterLinha(contexto);
        estadoNoEnvio = {
          tokenHash: linha.tokenHash,
          pendingTokenHash: linha.pendingTokenHash,
        };
        return Promise.resolve();
      });

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(estadoNoEnvio?.tokenHash).toBe(ativoAntes.tokenHash);
      expect(typeof estadoNoEnvio?.pendingTokenHash).toBe('string');
      expect(obterLinha(contexto).tokenHash).not.toBe(ativoAntes.tokenHash);
    });

    it('promove o hash pendente para o hash ativo', async () => {
      let tokenEnviado = '';

      contexto.enviarEmail.mockImplementation(
        (_email: string, token: string) => {
          tokenEnviado = token;
          return Promise.resolve();
        },
      );

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(obterLinha(contexto).tokenHash).toBe(sha256(tokenEnviado));
    });

    it('registra a auditoria da solicitação após o sucesso SMTP', async () => {
      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(contexto.registrarAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          acao: 'SOLICITACAO_RECUPERACAO_SENHA',
          entidade: 'Usuario',
          entidadeId: USUARIO_ID,
          ip: IP,
        }),
      );
    });

    it('calcula a expiração ativa a partir da promoção', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-11-08T12:00:00.000Z'));

      contexto.enviarEmail.mockImplementation(() => {
        jest.setSystemTime(new Date('2026-11-08T12:02:00.000Z'));
        return Promise.resolve();
      });

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const linha = obterLinha(contexto);
      expect(linha.expiresAt?.toISOString()).toBe(
        new Date(
          new Date('2026-11-08T12:02:00.000Z').getTime() + VALIDADE_ATIVA_MS,
        ).toISOString(),
      );
    });

    it('reinicializa usedAt na promoção', async () => {
      prepararTokenAtivo(contexto, { usado: true });
      expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(obterLinha(contexto).usedAt).toBeNull();
    });

    it('limpa todos os campos pendentes após a promoção', async () => {
      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const linha = obterLinha(contexto);
      expect(linha.pendingTokenHash).toBeNull();
      expect(linha.pendingExpiresAt).toBeNull();
      expect(linha.pendingRequestId).toBeNull();
      expect(linha.pendingCreatedAt).toBeNull();
    });

    it('promove condicionalmente pelo pendingRequestId', async () => {
      const agora = new Date();
      const dados: DadosReservaTeste = {
        tokenHash: sha256('pendente'),
        pendingExpiresAt: new Date(agora.getTime() + VALIDADE_PENDENTE_MS),
        pendingCreatedAt: agora,
        requestId: 'req-certo',
      };

      await contexto.privado.reservarPendencia(USUARIO_ID, dados);

      await expect(
        contexto.privado.promoverPendencia(USUARIO_ID, 'req-errado'),
      ).resolves.toBe(false);
      expect(obterLinha(contexto).tokenHash).toBeNull();

      await expect(
        contexto.privado.promoverPendencia(USUARIO_ID, 'req-certo'),
      ).resolves.toBe(true);
      expect(obterLinha(contexto).tokenHash).toBe(dados.tokenHash);
    });
  });

  describe('solicitarRecuperacao — falhas', () => {
    it('falha SMTP preserva o token ativo anterior', async () => {
      prepararTokenAtivo(contexto);
      const ativoAntes = { ...obterLinha(contexto) };

      contexto.enviarEmail.mockRejectedValueOnce(
        new Error('SMTP indisponível'),
      );

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const linha = obterLinha(contexto);
      expect(linha.tokenHash).toBe(ativoAntes.tokenHash);
      expect(linha.expiresAt).toEqual(ativoAntes.expiresAt);
      expect(linha.usedAt).toEqual(ativoAntes.usedAt);
      expect(linha.pendingTokenHash).toBeNull();
      expect(contexto.registrarAuditoria).not.toHaveBeenCalled();
    });

    it('falha SMTP limpa somente a própria pendência', async () => {
      prepararTokenAtivo(contexto);
      const ativoAntes = { ...obterLinha(contexto) };

      contexto.enviarEmail.mockRejectedValueOnce(
        new Error('SMTP indisponível'),
      );

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const cancelamento = contexto.banco.updatesMany.find(
        (atualizacao) => atualizacao.data.tokenHash === undefined,
      );

      expect(cancelamento?.where.userId).toBe(USUARIO_ID);
      expect(cancelamento?.where.pendingRequestId).toEqual(expect.any(String));
      expect(obterLinha(contexto).tokenHash).toBe(ativoAntes.tokenHash);
    });

    it('timeout não promove o token', async () => {
      prepararTokenAtivo(contexto);
      const ativoAntes = { ...obterLinha(contexto) };

      contexto.enviarEmail.mockRejectedValueOnce(new Error('timeout'));

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const promocao = contexto.banco.updatesMany.find(
        (atualizacao) => atualizacao.data.tokenHash !== undefined,
      );

      expect(promocao).toBeUndefined();
      expect(obterLinha(contexto).tokenHash).toBe(ativoAntes.tokenHash);
    });

    it('falha antiga não limpa a pendência mais recente', async () => {
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

      const solicitacaoA = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouA.promessa;

      const solicitacaoB = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouB.promessa;

      const pendenciaB = obterLinha(contexto).pendingRequestId;
      expect(pendenciaB).toEqual(expect.any(String));

      smtpA.rejeitar(new Error('SMTP A'));
      await solicitacaoA;

      expect(obterLinha(contexto).pendingRequestId).toBe(pendenciaB);

      smtpB.resolver();
      await solicitacaoB;

      expect(obterLinha(contexto).pendingRequestId).toBeNull();
      expect(obterLinha(contexto).tokenHash).not.toBeNull();
    });

    it('falha na promoção não altera indevidamente o token ativo', async () => {
      prepararTokenAtivo(contexto);
      const ativoAntes = { ...obterLinha(contexto) };
      contexto.banco.falharPromocao = new Error('falha de promoção');

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const linha = obterLinha(contexto);
      expect(linha.tokenHash).toBe(ativoAntes.tokenHash);
      expect(linha.expiresAt).toEqual(ativoAntes.expiresAt);
      expect(linha.pendingTokenHash).not.toBeNull();
      expect(contexto.banco.transacoesRevertidas).toBeGreaterThanOrEqual(1);
      expect(mensagensDeLog(contexto.logErro)).toContain(
        'Falha ao promover a solicitação de recuperação de senha.',
      );
      expect(contexto.registrarAuditoria).not.toHaveBeenCalled();
    });
  });

  describe('concorrência', () => {
    it('A reserva, B substitui, B promove e A não promove', async () => {
      const smtpA = criarDeferred<void>();
      const chegouA = criarDeferred<void>();
      const tokensEnviados: string[] = [];
      let chamadas = 0;

      contexto.enviarEmail.mockImplementation(
        (_email: string, token: string) => {
          chamadas += 1;
          tokensEnviados.push(token);

          if (chamadas === 1) {
            chegouA.resolver();
            return smtpA.promessa;
          }

          return Promise.resolve();
        },
      );

      const solicitacaoA = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouA.promessa;

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const tokenB = tokensEnviados[1];
      expect(obterLinha(contexto).tokenHash).toBe(sha256(tokenB));

      smtpA.resolver();
      await solicitacaoA;

      expect(obterLinha(contexto).tokenHash).toBe(sha256(tokenB));
      expect(obterLinha(contexto).tokenHash).not.toBe(
        sha256(tokensEnviados[0]),
      );
      expect(contexto.registrarAuditoria).toHaveBeenCalledTimes(1);
    });

    it('A reserva, B substitui, B falha e A não promove', async () => {
      const smtpA = criarDeferred<void>();
      const chegouA = criarDeferred<void>();
      let chamadas = 0;

      contexto.enviarEmail.mockImplementation(() => {
        chamadas += 1;

        if (chamadas === 1) {
          chegouA.resolver();
          return smtpA.promessa;
        }

        return Promise.reject(new Error('SMTP B'));
      });

      const solicitacaoA = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouA.promessa;

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      smtpA.resolver();
      await solicitacaoA;

      const linha = obterLinha(contexto);
      expect(linha.tokenHash).toBeNull();
      expect(linha.pendingTokenHash).toBeNull();
    });

    it('duas promoções do mesmo requestId causam apenas uma ativação', async () => {
      const agora = new Date();
      const dados: DadosReservaTeste = {
        tokenHash: sha256('unico'),
        pendingExpiresAt: new Date(agora.getTime() + VALIDADE_PENDENTE_MS),
        pendingCreatedAt: agora,
        requestId: 'req-unico',
      };

      await contexto.privado.reservarPendencia(USUARIO_ID, dados);

      await expect(
        contexto.privado.promoverPendencia(USUARIO_ID, 'req-unico'),
      ).resolves.toBe(true);
      await expect(
        contexto.privado.promoverPendencia(USUARIO_ID, 'req-unico'),
      ).resolves.toBe(false);

      const promocoes = contexto.banco.updatesMany.filter(
        (atualizacao) => atualizacao.data.tokenHash !== undefined,
      );

      expect(promocoes).toHaveLength(1);
      expect(obterLinha(contexto).tokenHash).toBe(dados.tokenHash);
    });

    it('pendência expirada não é promovida', async () => {
      prepararTokenAtivo(contexto);
      const ativoAntes = { ...obterLinha(contexto) };

      const dados: DadosReservaTeste = {
        tokenHash: sha256('expirado'),
        pendingExpiresAt: new Date(Date.now() - 1_000),
        pendingCreatedAt: new Date(Date.now() - VALIDADE_PENDENTE_MS),
        requestId: 'req-expirado',
      };

      await contexto.privado.reservarPendencia(USUARIO_ID, dados);

      await expect(
        contexto.privado.promoverPendencia(USUARIO_ID, 'req-expirado'),
      ).resolves.toBe(false);

      const linha = obterLinha(contexto);
      expect(linha.tokenHash).toBe(ativoAntes.tokenHash);
      expect(linha.pendingTokenHash).toBeNull();
    });

    it('token ativo anterior é consumível e não é reativado após a redefinição', async () => {
      prepararTokenAtivo(contexto);
      const smtpA = criarDeferred<void>();
      const chegouA = criarDeferred<void>();

      contexto.enviarEmail.mockImplementation(() => {
        chegouA.resolver();
        return smtpA.promessa;
      });

      const solicitacaoA = contexto.service.solicitarRecuperacao(EMAIL, IP);
      await chegouA.promessa;

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);
      expect(obterUsuario(contexto).senha).toBe('hash-gerado');

      smtpA.resolver();
      await solicitacaoA;

      expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);
      expect(obterLinha(contexto).tokenHash).toBe(TOKEN_HASH);
      expect(obterLinha(contexto).pendingTokenHash).toBeNull();
    });

    it('token anterior deixa de ser válido após a promoção', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('segurança', () => {
    it('nunca persiste o token bruto', async () => {
      let tokenEnviado = '';

      contexto.enviarEmail.mockImplementation(
        (_email: string, token: string) => {
          tokenEnviado = token;
          return Promise.resolve();
        },
      );

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const persistido = JSON.stringify([...contexto.banco.tokens.values()]);
      expect(persistido).not.toContain(tokenEnviado);
      expect(obterLinha(contexto).tokenHash).toBe(sha256(tokenEnviado));
    });

    it('persiste somente hash SHA-256', async () => {
      let tokenEnviado = '';

      contexto.enviarEmail.mockImplementation(
        (_email: string, token: string) => {
          tokenEnviado = token;
          return Promise.resolve();
        },
      );

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const linha = obterLinha(contexto);
      expect(linha.tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(linha.tokenHash).toBe(sha256(tokenEnviado));
    });

    it('não inclui segredos nos logs nem na auditoria', async () => {
      let tokenEnviado = '';
      contexto.banco.falharPromocao = new Error('falha de promoção');

      contexto.enviarEmail.mockImplementation(
        (_email: string, token: string) => {
          tokenEnviado = token;
          return Promise.resolve();
        },
      );

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      const logs = mensagensDeLog(contexto.logErro);
      const auditoria = JSON.stringify(contexto.registrarAuditoria.mock.calls);

      for (const segredo of [tokenEnviado, sha256(tokenEnviado), NOVA_SENHA]) {
        expect(logs).not.toContain(segredo);
        expect(auditoria).not.toContain(segredo);
      }
    });

    it('linha apenas pendente não pode ser consumida', async () => {
      contexto.banco.adicionarToken({
        ...criarLinhaAtiva(
          USUARIO_ID,
          'token-sem-ativo',
          new Date(Date.now() + VALIDADE_ATIVA_MS),
        ),
        tokenHash: null,
        expiresAt: null,
        pendingTokenHash: sha256('pendente'),
        pendingExpiresAt: new Date(Date.now() + VALIDADE_PENDENTE_MS),
        pendingRequestId: 'req-pendente',
        pendingCreatedAt: new Date(),
      });

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('mantém resposta genérica para usuário inexistente e inativo', async () => {
      const inexistente = await contexto.service.solicitarRecuperacao(
        'inexistente@email.com',
      );

      expect(inexistente).toBeUndefined();
      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.eventos).toHaveLength(0);

      obterUsuario(contexto).ativo = false;
      const inativo = await contexto.service.solicitarRecuperacao(EMAIL);

      expect(inativo).toBeUndefined();
      expect(contexto.enviarEmail).not.toHaveBeenCalled();
      expect(contexto.banco.eventos).toHaveLength(0);
      expect(contexto.banco.tokens.size).toBe(0);
    });
  });

  describe('redefinirSenha', () => {
    it('redefine a senha e audita via cliente transacional', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      expect(contexto.banco.transacoesConfirmadas).toBe(1);
      expect(contexto.banco.ordem).toContain('lock-token-ativo');
      expect(obterUsuario(contexto).senha).toBe('hash-gerado');
      expect(obterUsuario(contexto).versaoAutorizacao).toBe(1);
      expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);
      expect(contexto.banco.auditorias).toHaveLength(1);
      expect(contexto.registrarAuditoria).not.toHaveBeenCalled();
    });

    it('executa a auditoria dentro do callback da transação', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      expect(contexto.banco.eventos).toEqual([
        'inicio-transacao',
        'auditoria',
        'fim-transacao',
      ]);
    });

    it('preserva evento, usuário, empresa e IP na auditoria', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      expect(contexto.banco.auditorias[0]).toEqual({
        acao: 'REDEFINICAO_SENHA_CONCLUIDA',
        entidade: 'Usuario',
        entidadeId: USUARIO_ID,
        dadosNovos: { senhaAlterada: true },
        empresaId: EMPRESA_ID,
        usuarioId: USUARIO_ID,
        ip: IP,
      });
    });

    it('não inclui token, hash ou senha nos dados de auditoria', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      const auditoria = JSON.stringify(contexto.banco.auditorias);
      expect(auditoria).not.toContain(TOKEN);
      expect(auditoria).not.toContain(TOKEN_HASH);
      expect(auditoria).not.toContain(NOVA_SENHA);
      expect(auditoria).not.toContain('hash-gerado');
    });

    it('rejeita a operação quando a auditoria falha', async () => {
      prepararTokenAtivo(contexto);
      contexto.banco.falharAuditoria = new Error('falha de auditoria');

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow('falha de auditoria');

      expect(contexto.banco.updatesUsuario).toHaveLength(1);
      expect(contexto.banco.updatesToken).toHaveLength(1);
      expect(obterUsuario(contexto).senha).toBe('senha-original');
      expect(obterLinha(contexto).usedAt).toBeNull();
    });

    it('não confirma a transação quando a auditoria falha', async () => {
      prepararTokenAtivo(contexto);
      contexto.banco.falharAuditoria = new Error('falha de auditoria');

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow('falha de auditoria');

      expect(contexto.banco.transacoesConfirmadas).toBe(0);
      expect(contexto.banco.transacoesRevertidas).toBe(1);
      expect(contexto.registrarAuditoria).not.toHaveBeenCalled();
    });

    it('lança erro se o token estiver expirado', async () => {
      prepararTokenAtivo(contexto, { expirado: true });

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.updatesToken).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('lança erro se o token já tiver sido utilizado', async () => {
      prepararTokenAtivo(contexto, { usado: true });

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.updatesToken).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('lança erro se o token for inexistente', async () => {
      await expect(
        contexto.service.redefinirSenha('token-inexistente', NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('lança erro se o usuário não existir ou estiver inativo', async () => {
      prepararTokenAtivo(contexto);
      contexto.banco.usuarios.delete(USUARIO_ID);

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(UnauthorizedException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });
  });

  describe('redefinirSenha — ordem canônica de locks', () => {
    it('bloqueia o usuário antes de bloquear o token', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      expect(contexto.banco.ordem[0]).toBe('lock-usuario');
      expect(contexto.banco.ordem).toContain('lock-token-ativo');
      expect(contexto.banco.ordem.indexOf('lock-usuario')).toBeLessThan(
        contexto.banco.ordem.indexOf('lock-token-ativo'),
      );
    });

    it('promoção mantém o usuário antes do token', async () => {
      prepararTokenAtivo(contexto);
      await contexto.privado.reservarPendencia(
        USUARIO_ID,
        criarDadosReserva('req-promocao'),
      );
      contexto.banco.ordem.length = 0;

      await contexto.privado.promoverPendencia(USUARIO_ID, 'req-promocao');

      expect(contexto.banco.ordem[0]).toBe('lock-usuario');
      expect(contexto.banco.ordem).toContain('lock-token-pendente');
      expect(contexto.banco.ordem.indexOf('lock-usuario')).toBeLessThan(
        contexto.banco.ordem.indexOf('lock-token-pendente'),
      );
    });

    it('cancelamento mantém o usuário antes do token', async () => {
      prepararTokenAtivo(contexto);
      await contexto.privado.reservarPendencia(
        USUARIO_ID,
        criarDadosReserva('req-cancelamento'),
      );
      contexto.banco.ordem.length = 0;

      await contexto.privado.cancelarPendencia(USUARIO_ID, 'req-cancelamento');

      expect(contexto.banco.ordem[0]).toBe('lock-usuario');
      expect(contexto.banco.ordem).toContain('updateMany');
      expect(contexto.banco.ordem.indexOf('lock-usuario')).toBeLessThan(
        contexto.banco.ordem.indexOf('updateMany'),
      );
    });

    it('reserva mantém o usuário antes do token', async () => {
      await contexto.privado.reservarPendencia(
        USUARIO_ID,
        criarDadosReserva('req-reserva'),
      );

      expect(contexto.banco.ordem[0]).toBe('lock-usuario');
      expect(contexto.banco.ordem).toContain('upsert');
      expect(contexto.banco.ordem.indexOf('lock-usuario')).toBeLessThan(
        contexto.banco.ordem.indexOf('upsert'),
      );
    });
  });

  describe('redefinirSenha — leitura-dica e revalidação sob lock', () => {
    it('token inexistente na dica é rejeitado sem abrir transação', async () => {
      await expect(
        contexto.service.redefinirSenha('token-inexistente', NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.leiturasDica).toHaveLength(1);
      expect(contexto.banco.eventos).toHaveLength(0);
      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('hash alterado entre a dica e o lock é rejeitado', async () => {
      prepararTokenAtivo(contexto);
      contexto.banco.aposLeituraDica = () => {
        obterLinha(contexto).tokenHash = sha256('token-trocado');
      };

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.updatesToken).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
      expect(obterUsuario(contexto).senha).toBe('senha-original');
    });

    it('registro removido entre a dica e o lock é rejeitado', async () => {
      prepararTokenAtivo(contexto);
      contexto.banco.aposLeituraDica = () => {
        contexto.banco.tokens.clear();
      };

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.updatesToken).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('token expirado sob lock não gera alteração parcial', async () => {
      prepararTokenAtivo(contexto, { expirado: true });

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.updatesToken).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
      expect(obterUsuario(contexto).versaoAutorizacao).toBe(0);
    });

    it('token consumido sob lock não gera alteração parcial', async () => {
      prepararTokenAtivo(contexto, { usado: true });

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.updatesToken).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('usuário inativo sob lock é rejeitado sem alteração parcial', async () => {
      prepararTokenAtivo(contexto);
      obterUsuario(contexto).ativo = false;

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(UnauthorizedException);

      expect(contexto.banco.updatesUsuario).toHaveLength(0);
      expect(contexto.banco.updatesToken).toHaveLength(0);
      expect(contexto.banco.auditorias).toHaveLength(0);
    });
  });

  describe('redefinirSenha — consumo atômico e limpeza de pendência', () => {
    it('atualiza senha, versão de autorização e usedAt', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      expect(obterUsuario(contexto).senha).toBe('hash-gerado');
      expect(obterUsuario(contexto).versaoAutorizacao).toBe(1);
      expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);
    });

    it('limpa os campos pending no mesmo UPDATE que consome o token', async () => {
      prepararTokenAtivo(contexto);
      await contexto.privado.reservarPendencia(
        USUARIO_ID,
        criarDadosReserva('req-pendente'),
      );

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      expect(contexto.banco.updatesToken).toHaveLength(1);
      expect(contexto.banco.updatesToken[0].data).toMatchObject({
        pendingTokenHash: null,
        pendingExpiresAt: null,
        pendingRequestId: null,
        pendingCreatedAt: null,
      });
      expect(contexto.banco.updatesToken[0].data.usedAt).toBeInstanceOf(Date);

      const linha = obterLinha(contexto);
      expect(linha.pendingTokenHash).toBeNull();
      expect(linha.pendingExpiresAt).toBeNull();
      expect(linha.pendingRequestId).toBeNull();
      expect(linha.pendingCreatedAt).toBeNull();
    });

    it('redefinição bem-sucedida impede promoção de pendência anterior', async () => {
      prepararTokenAtivo(contexto);
      await contexto.privado.reservarPendencia(
        USUARIO_ID,
        criarDadosReserva('req-anterior'),
      );

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      await expect(
        contexto.privado.promoverPendencia(USUARIO_ID, 'req-anterior'),
      ).resolves.toBe(false);

      expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);
      expect(obterLinha(contexto).tokenHash).toBe(TOKEN_HASH);
      expect(obterLinha(contexto).pendingTokenHash).toBeNull();
    });

    it('promoção aguardando o lock não reativa token após a redefinição', async () => {
      prepararTokenAtivo(contexto);
      await contexto.privado.reservarPendencia(
        USUARIO_ID,
        criarDadosReserva('req-aguardando'),
      );

      const chegouAoBloqueio = criarDeferred<void>();
      const liberarBloqueio = criarDeferred<void>();

      contexto.banco.pausaBloqueioUsuario = async () => {
        chegouAoBloqueio.resolver();
        await liberarBloqueio.promessa;
      };

      const promocao = contexto.privado.promoverPendencia(
        USUARIO_ID,
        'req-aguardando',
      );

      await chegouAoBloqueio.promessa;

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      liberarBloqueio.resolver();

      await expect(promocao).resolves.toBe(false);
      expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);
      expect(obterLinha(contexto).tokenHash).toBe(TOKEN_HASH);
      expect(obterLinha(contexto).pendingTokenHash).toBeNull();
    });

    it('duas redefinições sequenciais com o mesmo token resultam em um sucesso', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(contexto.banco.transacoesConfirmadas).toBe(1);
      expect(contexto.banco.transacoesRevertidas).toBe(1);
      expect(contexto.banco.updatesUsuario).toHaveLength(1);
      expect(contexto.banco.updatesToken).toHaveLength(1);
      expect(contexto.banco.auditorias).toHaveLength(1);
      expect(obterUsuario(contexto).versaoAutorizacao).toBe(1);
    });

    it('replay não altera senha, auditoria nem versão de autorização', async () => {
      prepararTokenAtivo(contexto);

      await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

      const senha = obterUsuario(contexto).senha;
      const versao = obterUsuario(contexto).versaoAutorizacao;
      const usedAt = obterLinha(contexto).usedAt;

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toThrow(BadRequestException);

      expect(obterUsuario(contexto).senha).toBe(senha);
      expect(obterUsuario(contexto).versaoAutorizacao).toBe(versao);
      expect(obterLinha(contexto).usedAt).toEqual(usedAt);
      expect(contexto.banco.auditorias).toHaveLength(1);
    });
  });

  describe('redefinirSenha — retry limitado', () => {
    it.each(['P2034', '40001', '40P01'])(
      'repete após %s e conclui uma única vez',
      async (code) => {
        prepararTokenAtivo(contexto);
        const erro =
          code === 'P2034' ? erroPrisma(code) : erroPrisma('P2010', { code });
        contexto.banco.falhasTransacao = [erro];

        await contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP);

        expect(contexto.banco.transacoesConfirmadas).toBe(1);
        expect(contexto.banco.transacoesRevertidas).toBe(1);
        expect(obterUsuario(contexto).senha).toBe('hash-gerado');
        expect(obterUsuario(contexto).versaoAutorizacao).toBe(1);
        expect(obterLinha(contexto).usedAt).toBeInstanceOf(Date);
        expect(contexto.banco.auditorias).toHaveLength(1);
      },
    );

    it('esgota três tentativas retentáveis com ConflictException', async () => {
      prepararTokenAtivo(contexto);
      contexto.banco.falhasTransacao = [
        erroPrisma('P2034'),
        erroPrisma('P2010', { code: '40P01' }),
        erroPrisma('P2010', { code: '40001' }),
      ];

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(contexto.banco.transacoesConfirmadas).toBe(0);
      expect(contexto.banco.transacoesRevertidas).toBe(3);
      expect(obterUsuario(contexto).senha).toBe('senha-original');
      expect(obterUsuario(contexto).versaoAutorizacao).toBe(0);
      expect(obterLinha(contexto).usedAt).toBeNull();
      expect(contexto.banco.auditorias).toHaveLength(0);
    });

    it('erro não retentável é propagado sem retry', async () => {
      prepararTokenAtivo(contexto);
      const erro = new BadRequestException('falha de negócio');
      contexto.banco.falhasTransacao = [erro];

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toBe(erro);

      expect(contexto.banco.transacoesRevertidas).toBe(1);
      expect(contexto.banco.transacoesConfirmadas).toBe(0);
      expect(obterUsuario(contexto).senha).toBe('senha-original');
      expect(obterLinha(contexto).usedAt).toBeNull();
    });

    it('P2010 sem 40001 ou 40P01 não é retentável', async () => {
      prepararTokenAtivo(contexto);
      const erro = erroPrisma('P2010', { code: '42601' });
      contexto.banco.falhasTransacao = [erro];

      await expect(
        contexto.service.redefinirSenha(TOKEN, NOVA_SENHA, IP),
      ).rejects.toBe(erro);

      expect(contexto.banco.transacoesRevertidas).toBe(1);
      expect(contexto.banco.transacoesConfirmadas).toBe(0);
    });
  });

  describe('solicitarRecuperacao — retry sem duplicar SMTP', () => {
    it('retry da reserva não envia SMTP antes da confirmação', async () => {
      contexto.banco.falhasTransacao = [erroPrisma('P2034')];
      let confirmadasNoEnvio = -1;

      contexto.enviarEmail.mockImplementation(() => {
        confirmadasNoEnvio = contexto.banco.transacoesConfirmadas;
        return Promise.resolve();
      });

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(contexto.enviarEmail).toHaveBeenCalledTimes(1);
      expect(contexto.banco.transacoesRevertidas).toBe(1);
      expect(confirmadasNoEnvio).toBe(1);
      expect(obterLinha(contexto).tokenHash).not.toBeNull();
    });

    it('retry da promoção não reenvia SMTP', async () => {
      contexto.banco.falhasTransacao = [
        undefined,
        erroPrisma('P2010', { code: '40P01' }),
      ];

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(contexto.enviarEmail).toHaveBeenCalledTimes(1);
      expect(contexto.banco.transacoesConfirmadas).toBe(2);
      expect(contexto.banco.transacoesRevertidas).toBe(1);
      expect(contexto.registrarAuditoria).toHaveBeenCalledTimes(1);
      expect(obterLinha(contexto).tokenHash).not.toBeNull();
      expect(obterLinha(contexto).pendingTokenHash).toBeNull();
    });

    it('falha de promoção não registra auditoria de sucesso', async () => {
      prepararTokenAtivo(contexto);
      contexto.banco.falharPromocao = new Error('falha de promoção');

      await contexto.service.solicitarRecuperacao(EMAIL, IP);

      expect(contexto.registrarAuditoria).not.toHaveBeenCalled();
      expect(mensagensDeLog(contexto.logErro)).toContain(
        'Falha ao promover a solicitação de recuperação de senha.',
      );
    });
  });
});
