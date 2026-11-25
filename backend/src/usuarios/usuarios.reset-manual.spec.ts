import {
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { gerarSenhaTemporaria } from '../common/utils/senha-temporaria.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from './usuarios.service';

type TipoUsuario = 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA';

type UsuarioFake = {
  id: string;
  email: string;
  ativo: boolean;
  tipo: TipoUsuario;
  empresaId: string | null;
  senha: string;
  versaoAutorizacao: number;
  trocaSenhaObrigatoria: boolean;
};

type TokenFake = {
  userId: string;
  tokenHash: string | null;
  expiresAt: Date | null;
  usedAt: Date | null;
  pendingTokenHash: string | null;
  pendingExpiresAt: Date | null;
  pendingRequestId: string | null;
  pendingCreatedAt: Date | null;
};

type AuditoriaFake = Record<string, unknown>;

const IP = '203.0.113.10';
const EMPRESA_A = 'empresa-a';
const EMPRESA_B = 'empresa-b';
const ATOR_SUPER = 'ator-super';
const ATOR_ADMIN = 'ator-admin';
const ALVO = 'alvo';
const SENHA_ORIGINAL = 'hash-original';

function criarUsuario(
  dados: Partial<UsuarioFake> & Pick<UsuarioFake, 'id'>,
): UsuarioFake {
  return {
    email: `${dados.id}@example.invalid`,
    ativo: true,
    tipo: 'USUARIO_EMPRESA',
    empresaId: EMPRESA_A,
    senha: SENHA_ORIGINAL,
    versaoAutorizacao: 0,
    trocaSenhaObrigatoria: false,
    ...dados,
  };
}

function criarTokenAtivo(userId: string): TokenFake {
  return {
    userId,
    tokenHash: 'hash-do-token-ativo',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    usedAt: null,
    pendingTokenHash: 'hash-da-pendencia',
    pendingExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    pendingRequestId: 'requisicao-pendente',
    pendingCreatedAt: new Date(),
  };
}

function criarTokenPendente(userId: string): TokenFake {
  return {
    userId,
    tokenHash: null,
    expiresAt: null,
    usedAt: null,
    pendingTokenHash: 'hash-da-pendencia',
    pendingExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    pendingRequestId: 'requisicao-pendente',
    pendingCreatedAt: new Date(),
  };
}

function criarTokenConsumido(userId: string): TokenFake {
  return {
    userId,
    tokenHash: 'hash-do-token-consumido',
    expiresAt: new Date(Date.now() - 60 * 1000),
    usedAt: new Date(Date.now() - 60 * 1000),
    pendingTokenHash: null,
    pendingExpiresAt: null,
    pendingRequestId: null,
    pendingCreatedAt: null,
  };
}

function validarPolitica(senha: string): void {
  expect(senha.length).toBeGreaterThanOrEqual(16);
  expect(senha).toMatch(/[a-z]/);
  expect(senha).toMatch(/[A-Z]/);
  expect(senha).toMatch(/[0-9]/);
  expect(senha).toMatch(/[^A-Za-z0-9]/);
}

/**
 * Banco transacional mínimo: o snapshot é restaurado quando o callback falha,
 * permitindo verificar rollback real das escritas feitas dentro da transação.
 */
class BancoFake {
  readonly usuarios = new Map<string, UsuarioFake>();
  readonly tokens = new Map<string, TokenFake>();
  readonly auditorias: AuditoriaFake[] = [];
  falharAuditoria = false;
  falhasConcorrencia = 0;
  erroNaoRelacionado: Error | null = null;

  snapshot(): {
    usuarios: Map<string, UsuarioFake>;
    tokens: Map<string, TokenFake>;
    auditorias: AuditoriaFake[];
  } {
    return structuredClone({
      usuarios: this.usuarios,
      tokens: this.tokens,
      auditorias: this.auditorias,
    });
  }

  restaurar(estado: ReturnType<BancoFake['snapshot']>): void {
    this.usuarios.clear();
    for (const [chave, valor] of estado.usuarios)
      this.usuarios.set(chave, valor);
    this.tokens.clear();
    for (const [chave, valor] of estado.tokens) this.tokens.set(chave, valor);
    this.auditorias.splice(0, this.auditorias.length, ...estado.auditorias);
  }

  readonly tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    usuario: {
      findUnique: ({ where }: { where: { id: string } }) => {
        const usuario = this.usuarios.get(where.id);
        return usuario ? structuredClone(usuario) : null;
      },
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: {
          senha?: string;
          trocaSenhaObrigatoria?: boolean;
          versaoAutorizacao?: { increment: number };
        };
      }) => {
        const usuario = this.usuarios.get(where.id);
        if (!usuario) throw new Error('Usuário inexistente no banco fake.');
        if (data.senha !== undefined) usuario.senha = data.senha;
        if (data.trocaSenhaObrigatoria !== undefined)
          usuario.trocaSenhaObrigatoria = data.trocaSenhaObrigatoria;
        if (data.versaoAutorizacao?.increment)
          usuario.versaoAutorizacao += data.versaoAutorizacao.increment;
        return {
          id: usuario.id,
          versaoAutorizacao: usuario.versaoAutorizacao,
        };
      },
    },
    passwordResetToken: {
      deleteMany: ({ where }: { where: { userId: string } }) => {
        const removido = this.tokens.delete(where.userId);
        return { count: removido ? 1 : 0 };
      },
      upsert: ({
        where,
        create,
        update,
      }: {
        where: { userId: string };
        create: Partial<TokenFake> & { userId: string };
        update: Partial<TokenFake>;
      }) => {
        const existente = this.tokens.get(where.userId);
        if (existente) {
          Object.assign(existente, update);
          return structuredClone(existente);
        }
        const criado: TokenFake = {
          tokenHash: null,
          expiresAt: null,
          usedAt: null,
          pendingTokenHash: null,
          pendingExpiresAt: null,
          pendingRequestId: null,
          pendingCreatedAt: null,
          ...create,
        };
        this.tokens.set(where.userId, criado);
        return structuredClone(criado);
      },
    },
    auditoriaLog: {
      create: ({ data }: { data: AuditoriaFake }) => {
        if (this.falharAuditoria) {
          throw new Error('Falha simulada na auditoria.');
        }
        this.auditorias.push(structuredClone(data));
        return { id: `auditoria-${this.auditorias.length}` };
      },
    },
  };

  readonly prisma = {
    $transaction: jest.fn(
      async (callback: (tx: BancoFake['tx']) => Promise<unknown>) => {
        if (this.erroNaoRelacionado) {
          throw this.erroNaoRelacionado;
        }
        if (this.falhasConcorrencia > 0) {
          this.falhasConcorrencia -= 1;
          throw new Prisma.PrismaClientKnownRequestError('concorrência', {
            code: 'P2034',
            clientVersion: 'teste',
          });
        }
        const estado = this.snapshot();
        try {
          return await callback(this.tx);
        } catch (erro) {
          this.restaurar(estado);
          throw erro;
        }
      },
    ),
  };
}

describe('UsuariosService — reset manual administrativo', () => {
  let service: UsuariosService;
  let banco: BancoFake;

  const resetar = (id: string, ator: AuthenticatedUser, ip?: string) =>
    service.resetarSenhaAdministrativaManual(id, ator, 0, ip);

  const atorSuperAdmin = (): AuthenticatedUser => ({
    id: ATOR_SUPER,
    email: 'super@example.invalid',
    tipo: 'SUPER_ADMIN',
    empresaId: null,
    versaoAutorizacao: 0,
  });

  beforeEach(() => {
    banco = new BancoFake();
    banco.usuarios.set(
      ATOR_SUPER,
      criarUsuario({
        id: ATOR_SUPER,
        tipo: 'SUPER_ADMIN',
        empresaId: null,
        email: 'super@example.invalid',
      }),
    );
    banco.usuarios.set(
      ATOR_ADMIN,
      criarUsuario({
        id: ATOR_ADMIN,
        tipo: 'ADMIN_EMPRESA',
        email: 'admin@example.invalid',
      }),
    );
    banco.usuarios.set(ALVO, criarUsuario({ id: ALVO }));
    banco.tokens.set(ALVO, criarTokenAtivo(ALVO));

    service = new UsuariosService(banco.prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('permite que SUPER_ADMIN ativo redefina a senha de outro usuário', async () => {
    const resultado = await resetar(ALVO, atorSuperAdmin(), IP);

    expect(resultado).toEqual({
      usuarioId: ALVO,
      email: `${ALVO}@example.invalid`,
      senhaTemporaria: expect.any(String) as unknown,
      versaoAutorizacao: 1,
    });
    expect(banco.usuarios.get(ALVO)?.senha).not.toBe(SENHA_ORIGINAL);
  });

  it('gera credencial compatível com a política de senha vigente', async () => {
    for (let execucao = 0; execucao < 50; execucao++) {
      validarPolitica(gerarSenhaTemporaria());
    }

    const { senhaTemporaria } = await resetar(ALVO, atorSuperAdmin());
    validarPolitica(senhaTemporaria);
  });

  it('persiste somente o hash seguro da senha temporária', async () => {
    const resultado = await resetar(ALVO, atorSuperAdmin());
    const senhaPersistida = banco.usuarios.get(ALVO)?.senha ?? '';

    expect(senhaPersistida).toMatch(/^\$2[aby]\$/);
    expect(senhaPersistida).not.toBe(resultado.senhaTemporaria);
    await expect(
      bcrypt.compare(resultado.senhaTemporaria, senhaPersistida),
    ).resolves.toBe(true);
  });

  it('define trocaSenhaObrigatoria e incrementa versaoAutorizacao', async () => {
    await resetar(ALVO, atorSuperAdmin());

    const usuario = banco.usuarios.get(ALVO);
    expect(usuario?.trocaSenhaObrigatoria).toBe(true);
    expect(usuario?.versaoAutorizacao).toBe(1);
  });

  it('remove o registro de recuperação do alvo, invalidando tokens anteriores', async () => {
    await resetar(ALVO, atorSuperAdmin(), IP);

    expect(banco.tokens.has(ALVO)).toBe(false);
    expect(banco.tokens.size).toBe(0);
  });

  it('funciona quando o alvo não possui registro de recuperação', async () => {
    banco.tokens.delete(ALVO);

    await expect(resetar(ALVO, atorSuperAdmin(), IP)).resolves.toMatchObject({
      usuarioId: ALVO,
    });

    expect(banco.tokens.size).toBe(0);
    expect(banco.auditorias).toHaveLength(1);
  });

  it('remove o token ativo e a pendência mantidos na mesma linha', async () => {
    banco.tokens.set(ALVO, criarTokenAtivo(ALVO));

    await resetar(ALVO, atorSuperAdmin(), IP);

    expect(banco.tokens.has(ALVO)).toBe(false);
  });

  it('remove o estado apenas pendente', async () => {
    banco.tokens.set(ALVO, criarTokenPendente(ALVO));

    await resetar(ALVO, atorSuperAdmin(), IP);

    expect(banco.tokens.has(ALVO)).toBe(false);
  });

  it('remove o registro de token já consumido', async () => {
    banco.tokens.set(ALVO, criarTokenConsumido(ALVO));

    await resetar(ALVO, atorSuperAdmin(), IP);

    expect(banco.tokens.has(ALVO)).toBe(false);
  });

  it('permite uma nova solicitação de recuperação após o reset', async () => {
    await resetar(ALVO, atorSuperAdmin(), IP);
    expect(banco.tokens.has(ALVO)).toBe(false);

    const pendencia = {
      userId: ALVO,
      pendingTokenHash: 'hash-nova-solicitacao',
      pendingExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      pendingRequestId: 'nova-requisicao',
      pendingCreatedAt: new Date(),
    };
    banco.tx.passwordResetToken.upsert({
      where: { userId: ALVO },
      create: pendencia,
      update: pendencia,
    });

    expect(banco.tokens.get(ALVO)).toMatchObject({
      userId: ALVO,
      tokenHash: null,
      pendingRequestId: 'nova-requisicao',
    });
    expect(banco.tokens.get(ALVO)?.pendingTokenHash).toBe(
      'hash-nova-solicitacao',
    );
  });

  it('registra auditoria na mesma transação, sem segredos', async () => {
    const resultado = await resetar(ALVO, atorSuperAdmin(), IP);

    expect(banco.auditorias).toHaveLength(1);
    const auditoria = banco.auditorias[0];
    expect(auditoria).toMatchObject({
      acao: 'RESET_SENHA_MANUAL',
      entidade: 'Usuario',
      entidadeId: ALVO,
      empresaId: EMPRESA_A,
      usuarioId: ATOR_SUPER,
      ip: IP,
    });

    const serializado = JSON.stringify(auditoria);
    expect(serializado).not.toContain(resultado.senhaTemporaria);
    expect(serializado).not.toContain(banco.usuarios.get(ALVO)?.senha ?? '');
  });

  it('não registra a senha temporária em logs', async () => {
    const saidas: string[] = [];
    const registrar = (...args: unknown[]) => {
      saidas.push(args.map((valor) => String(valor)).join(' '));
    };
    jest.spyOn(console, 'log').mockImplementation(registrar);
    jest.spyOn(console, 'warn').mockImplementation(registrar);
    jest.spyOn(console, 'error').mockImplementation(registrar);
    for (const metodo of [
      'log',
      'warn',
      'error',
      'debug',
      'verbose',
    ] as const) {
      jest.spyOn(Logger.prototype, metodo).mockImplementation(registrar);
    }

    const resultado = await resetar(ALVO, atorSuperAdmin());

    expect(saidas.join('\n')).not.toContain(resultado.senhaTemporaria);
  });

  it('bloqueia reset da própria conta', async () => {
    await expect(resetar(ATOR_SUPER, atorSuperAdmin())).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(banco.usuarios.get(ATOR_SUPER)?.senha).toBe(SENHA_ORIGINAL);
    expect(banco.usuarios.get(ATOR_SUPER)?.versaoAutorizacao).toBe(0);
    expect(banco.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('bloqueia ADMIN_EMPRESA mesmo com permissão de edição', async () => {
    const atorAdmin: AuthenticatedUser = {
      id: ATOR_ADMIN,
      email: 'admin@example.invalid',
      tipo: 'ADMIN_EMPRESA',
      empresaId: EMPRESA_A,
      versaoAutorizacao: 0,
      permissoes: ['usuarios.editar'],
    };

    await expect(resetar(ALVO, atorAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(banco.prisma.$transaction).not.toHaveBeenCalled();
    expect(banco.usuarios.get(ALVO)?.senha).toBe(SENHA_ORIGINAL);
  });

  it('rejeita usuário-alvo inexistente', async () => {
    await expect(
      resetar('inexistente', atorSuperAdmin()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita usuário-alvo inativo e não altera nada', async () => {
    const inativo = criarUsuario({ id: ALVO, ativo: false });
    banco.usuarios.set(ALVO, inativo);

    await expect(resetar(ALVO, atorSuperAdmin())).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(banco.usuarios.get(ALVO)).toMatchObject({
      ativo: false,
      senha: SENHA_ORIGINAL,
      versaoAutorizacao: 0,
      trocaSenhaObrigatoria: false,
    });
    expect(banco.auditorias).toHaveLength(0);
  });

  const casosAtor: Array<[string, Partial<UsuarioFake>]> = [
    ['inativo', { ativo: false }],
    ['com versão divergente', { versaoAutorizacao: 7 }],
    ['rebaixado', { tipo: 'ADMIN_EMPRESA' }],
    ['com empresa vinculada', { empresaId: EMPRESA_B }],
  ];

  it.each(casosAtor)(
    'revalida o ator no banco: %s',
    async (_caso, alteracao) => {
      banco.usuarios.set(ATOR_SUPER, {
        ...(banco.usuarios.get(ATOR_SUPER) as UsuarioFake),
        ...alteracao,
      });

      await expect(resetar(ALVO, atorSuperAdmin())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(banco.usuarios.get(ALVO)?.senha).toBe(SENHA_ORIGINAL);
    },
  );

  describe('concorrência otimista pela versão do alvo', () => {
    const capturarConflito = async (execucao: Promise<unknown>) => {
      let capturado: unknown;
      try {
        await execucao;
      } catch (erro) {
        capturado = erro;
      }
      expect(capturado).toBeInstanceOf(ConflictException);
      return (capturado as ConflictException).getResponse() as Record<
        string,
        unknown
      >;
    };

    it('aceita a versão igual e devolve a nova versão', async () => {
      banco.usuarios.set(
        ALVO,
        criarUsuario({ id: ALVO, versaoAutorizacao: 4 }),
      );

      const resultado = await service.resetarSenhaAdministrativaManual(
        ALVO,
        atorSuperAdmin(),
        4,
        IP,
      );

      expect(resultado.versaoAutorizacao).toBe(5);
      expect(banco.usuarios.get(ALVO)?.versaoAutorizacao).toBe(5);
    });

    it('rejeita versão menor sem escrever, excluir token ou auditar', async () => {
      banco.usuarios.set(
        ALVO,
        criarUsuario({ id: ALVO, versaoAutorizacao: 3 }),
      );

      const resposta = await capturarConflito(
        service.resetarSenhaAdministrativaManual(ALVO, atorSuperAdmin(), 2),
      );

      expect(resposta.error).toBe('RESET_CONCORRENTE');
      expect(String(resposta.message)).toContain('Recarregue');
      expect(resposta).not.toHaveProperty('senhaTemporaria');
      expect(resposta).not.toHaveProperty('versaoAutorizacao');
      expect(banco.usuarios.get(ALVO)).toMatchObject({
        senha: SENHA_ORIGINAL,
        versaoAutorizacao: 3,
        trocaSenhaObrigatoria: false,
      });
      expect(banco.tokens.get(ALVO)).toMatchObject({
        tokenHash: 'hash-do-token-ativo',
        usedAt: null,
      });
      expect(banco.auditorias).toHaveLength(0);
    });

    it('rejeita versão maior sem efeitos colaterais', async () => {
      const resposta = await capturarConflito(
        service.resetarSenhaAdministrativaManual(ALVO, atorSuperAdmin(), 5),
      );

      expect(resposta.error).toBe('RESET_CONCORRENTE');
      expect(banco.usuarios.get(ALVO)).toMatchObject({
        senha: SENHA_ORIGINAL,
        versaoAutorizacao: 0,
      });
      expect(banco.tokens.has(ALVO)).toBe(true);
      expect(banco.auditorias).toHaveLength(0);
    });

    it('dá precedência ao 401 do ator sobre a divergência de versão', async () => {
      banco.usuarios.set(ATOR_SUPER, {
        ...(banco.usuarios.get(ATOR_SUPER) as UsuarioFake),
        versaoAutorizacao: 7,
      });

      await expect(
        service.resetarSenhaAdministrativaManual(ALVO, atorSuperAdmin(), 99),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(banco.auditorias).toHaveLength(0);
    });

    it('dá precedência ao 403 do alvo inativo sobre a divergência', async () => {
      banco.usuarios.set(ALVO, criarUsuario({ id: ALVO, ativo: false }));

      await expect(
        service.resetarSenhaAdministrativaManual(ALVO, atorSuperAdmin(), 99),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(banco.auditorias).toHaveLength(0);
    });

    it('dá precedência ao 404 do alvo inexistente sobre a divergência', async () => {
      await expect(
        service.resetarSenhaAdministrativaManual(
          'inexistente',
          atorSuperAdmin(),
          99,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(banco.auditorias).toHaveLength(0);
    });

    it('retorna 503 sem RESET_CONCORRENTE quando o retry esgota', async () => {
      banco.falhasConcorrencia = 3;

      let capturado: unknown;
      try {
        await service.resetarSenhaAdministrativaManual(
          ALVO,
          atorSuperAdmin(),
          0,
        );
      } catch (erro) {
        capturado = erro;
      }

      expect(capturado).toBeInstanceOf(ServiceUnavailableException);
      const resposta = (
        capturado as ServiceUnavailableException
      ).getResponse() as Record<string, unknown>;
      expect(resposta).not.toHaveProperty('error', 'RESET_CONCORRENTE');
      expect(resposta.statusCode).toBe(503);
      expect(String(resposta.message)).toContain('indisponível');
      expect(banco.usuarios.get(ALVO)).toMatchObject({
        senha: SENHA_ORIGINAL,
        versaoAutorizacao: 0,
        trocaSenhaObrigatoria: false,
      });
      expect(banco.tokens.has(ALVO)).toBe(true);
      expect(banco.auditorias).toHaveLength(0);
    });

    it('não converte erro não relacionado em 409 nem 503', async () => {
      banco.erroNaoRelacionado = new Prisma.PrismaClientKnownRequestError(
        'violação de unicidade',
        { code: 'P2002', clientVersion: 'teste' },
      );

      let capturado: unknown;
      try {
        await service.resetarSenhaAdministrativaManual(
          ALVO,
          atorSuperAdmin(),
          0,
        );
      } catch (erro) {
        capturado = erro;
      }

      expect(capturado).toBe(banco.erroNaoRelacionado);
      expect(capturado).not.toBeInstanceOf(ConflictException);
      expect(capturado).not.toBeInstanceOf(ServiceUnavailableException);
      expect(banco.auditorias).toHaveLength(0);
    });

    it('não converte falha genérica de banco em 409 nem 503', async () => {
      banco.erroNaoRelacionado = new Error('falha de conexão simulada');

      await expect(
        service.resetarSenhaAdministrativaManual(ALVO, atorSuperAdmin(), 0),
      ).rejects.toThrow('falha de conexão simulada');

      expect(banco.usuarios.get(ALVO)?.versaoAutorizacao).toBe(0);
      expect(banco.auditorias).toHaveLength(0);
    });
  });

  it('faz rollback total quando a auditoria falha', async () => {
    banco.falharAuditoria = true;

    await expect(resetar(ALVO, atorSuperAdmin(), IP)).rejects.toThrow(
      'Falha simulada na auditoria.',
    );

    expect(banco.usuarios.get(ALVO)).toMatchObject({
      senha: SENHA_ORIGINAL,
      versaoAutorizacao: 0,
      trocaSenhaObrigatoria: false,
    });
    expect(banco.tokens.get(ALVO)).toMatchObject({
      tokenHash: 'hash-do-token-ativo',
      usedAt: null,
      pendingTokenHash: 'hash-da-pendencia',
      pendingRequestId: 'requisicao-pendente',
    });
    expect(banco.auditorias).toHaveLength(0);
  });

  it('repete a transação em conflito de concorrência', async () => {
    banco.falhasConcorrencia = 1;

    const resultado = await resetar(ALVO, atorSuperAdmin());

    expect(resultado.senhaTemporaria).toEqual(expect.any(String));
    expect(banco.prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(banco.usuarios.get(ALVO)?.versaoAutorizacao).toBe(1);
    expect(banco.auditorias).toHaveLength(1);
  });
});
