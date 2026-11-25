import { Prisma, PrismaClient, UserType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { RecoveryService } from '../../auth/recovery.service';
import type { MailService } from '../../common/services/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuariosService } from '../usuarios.service';

export const BANCO_INTEGRACAO = 'sistema_gestao_integracao';
export const SCHEMA_INTEGRACAO = 'public';
export const PREFIXO_FIXTURE = 'IT_RESET_';
export const VARIAVEL_URL_INTEGRACAO = 'INTEGRATION_DATABASE_URL';
export const VARIAVEL_HABILITACAO = 'RUN_RESET_INTEGRATION_TESTS';
export const SENHA_ORIGINAL_FIXTURE = 'SenhaOriginal#12345';

export type EstadoTokenRecuperacao =
  | 'nenhum'
  | 'ativo'
  | 'pendente'
  | 'consumido';

export type UsuarioFixture = {
  id: string;
  nome: string;
  email: string;
  senha: string;
  tipo: UserType;
  ativo: boolean;
  empresaId: string | null;
  versaoAutorizacao: number;
  trocaSenhaObrigatoria: boolean;
};

export type ResultadoReset = {
  usuarioId: string;
  email: string;
  senhaTemporaria: string;
  versaoAutorizacao: number;
};

export type ContextoReset = {
  url: string;
  prisma: PrismaClient;
  auxiliares: PrismaClient[];
  todosClientes: PrismaClient[];
  runId: string;
  prefixo: string;
  empresaId: string;
  senhaOriginalHash: string;
  ator: UsuarioFixture;
  alvo: UsuarioFixture;
  usuarios: string[];
};

export type ContadorTentativas = {
  registrar: () => void;
  total: () => number;
};

export type ErroObservado = {
  codigo: string | null;
  sqlstate: string | null;
  clientVersion: string | null;
};

export type ObservadorErros = {
  registrar: (erro: unknown) => void;
  erros: () => ErroObservado[];
  codigos: () => string[];
  sqlstates: () => string[];
};

export type GanchosTransacao = {
  /**
   * Recebe o `pg_backend_pid()` da sessão que executa a transação, capturado
   * logo após o BEGIN e antes de qualquer consulta do serviço. Permite
   * observar a sessão exata em pg_stat_activity/pg_blocking_pids sem tocar no
   * código de produção.
   */
  aoIniciarTransacao?: (pid: number) => void;
  aoFalharTransacao?: (erro: unknown) => void;
  aoIniciarQueryRaw?: (indice: number) => void;
  aposConcluirQueryRaw?: (indice: number) => Promise<void> | void;
};

type OpcoesTransacao = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

/**
 * Habilita a suíte apenas com o valor exato 'true'. Qualquer outro valor,
 * inclusive 'TRUE', '1' ou ausência, mantém a suíte ignorada.
 */
export function integracaoHabilitada(
  valor = process.env[VARIAVEL_HABILITACAO],
): boolean {
  return valor === 'true';
}

/**
 * Somente INTEGRATION_DATABASE_URL. DATABASE_URL nunca é usado como fallback.
 * A mensagem de erro não inclui URL, usuário, senha ou parâmetros.
 */
export function obterUrlIntegracao(
  valor = process.env[VARIAVEL_URL_INTEGRACAO],
): string {
  if (!valor) {
    throw new Error(
      `${VARIAVEL_URL_INTEGRACAO} não configurada. A suíte de integração não usa DATABASE_URL como fallback.`,
    );
  }
  return valor;
}

/**
 * Recusa bancos de teste/produção e qualquer banco diferente do isolado.
 * Executada com o resultado de current_database()/current_schema() antes de
 * qualquer escrita. Não recebe nem imprime credenciais.
 */
export function validarIdentidadeBanco(banco: string, schema: string): void {
  if (banco === 'sistema_gestao_teste' || banco === 'sistema_gestao_prod') {
    throw new Error(`Banco proibido para a suíte de integração: ${banco}.`);
  }
  if (banco !== BANCO_INTEGRACAO) {
    throw new Error(`Banco de integração inesperado: ${banco}.`);
  }
  if (schema !== SCHEMA_INTEGRACAO) {
    throw new Error(`Schema de integração inesperado: ${schema}.`);
  }
}

export function criarClienteIntegracao(url: string): PrismaClient {
  return new PrismaClient({ datasourceUrl: url });
}

export async function validarClienteIntegracao(
  prisma: PrismaClient,
): Promise<void> {
  const [identidade] = await prisma.$queryRaw<
    Array<{ banco: string; schema: string }>
  >`SELECT current_database() AS banco, current_schema() AS schema`;
  if (!identidade) {
    throw new Error('Não foi possível verificar a identidade do banco.');
  }
  validarIdentidadeBanco(identidade.banco, identidade.schema);
}

/** Desconecta todos os clientes informados sem mascarar o erro original. */
export async function desconectarClientes(
  clientes: PrismaClient[],
): Promise<void> {
  await Promise.allSettled(clientes.map((cliente) => cliente.$disconnect()));
}

function codigoPrisma(erro: unknown): string | null {
  return erro instanceof Prisma.PrismaClientKnownRequestError
    ? erro.code
    : null;
}

/** Código Prisma efetivamente recebido (ex.: P2034, P2010). */
export function codigoDoErro(erro: unknown): string | null {
  return codigoPrisma(erro);
}

/** Client que originou o erro Prisma; identifica injeções controladas. */
export function clientVersionDoErro(erro: unknown): string | null {
  return erro instanceof Prisma.PrismaClientKnownRequestError
    ? erro.clientVersion
    : null;
}

/**
 * SQLSTATE exposto pelo Prisma em `meta.code` (ex.: '40001'/'40P01').
 * Retorna null quando a camada não expõe o SQLSTATE de forma verificável.
 */
export function sqlStateDoErro(erro: unknown): string | null {
  if (!(erro instanceof Prisma.PrismaClientKnownRequestError)) return null;
  const meta: Record<string, unknown> | undefined = erro.meta;
  const codigo = meta?.['code'];
  if (typeof codigo === 'string' || typeof codigo === 'number') {
    return String(codigo);
  }
  return null;
}

/**
 * Registra, por tentativa, o código Prisma e o SQLSTATE efetivamente
 * recebidos. Não interpreta nem inventa SQLSTATE ausente.
 */
export function criarObservadorErros(): ObservadorErros {
  const registros: ErroObservado[] = [];
  return {
    registrar: (erro) => {
      registros.push({
        codigo: codigoPrisma(erro),
        sqlstate: sqlStateDoErro(erro),
        clientVersion: clientVersionDoErro(erro),
      });
    },
    erros: () => [...registros],
    codigos: () =>
      registros
        .map((registro) => registro.codigo)
        .filter((codigo): codigo is string => codigo !== null),
    sqlstates: () =>
      registros
        .map((registro) => registro.sqlstate)
        .filter((codigo): codigo is string => codigo !== null),
  };
}

/**
 * Preserva a exceção original como erro principal e anexa a falha de
 * limpeza como `cause`, sem descartar nenhuma das duas.
 */
function anexarCausa(principal: unknown, causa: unknown): unknown {
  if (!(principal instanceof Error)) {
    return new Error(String(principal), { cause: causa });
  }
  if (principal.cause === undefined) {
    Object.defineProperty(principal, 'cause', {
      value: causa,
      configurable: true,
      writable: true,
    });
    return principal;
  }
  return new AggregateError([principal, causa], principal.message);
}

function hashUnico(rotulo: string): string {
  return createHash('sha256').update(`${rotulo}-${randomUUID()}`).digest('hex');
}

async function criarUsuario(
  prisma: PrismaClient,
  dados: {
    empresaId: string | null;
    prefixo: string;
    sufixo: string;
    tipo: UserType;
    senha: string;
  },
): Promise<UsuarioFixture> {
  const nome = `${dados.prefixo}${dados.sufixo}`;
  return prisma.usuario.create({
    data: {
      empresaId: dados.empresaId,
      nome,
      email: `${nome}@example.invalid`.toLowerCase(),
      senha: dados.senha,
      tipo: dados.tipo,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      senha: true,
      tipo: true,
      ativo: true,
      empresaId: true,
      versaoAutorizacao: true,
      trocaSenhaObrigatoria: true,
    },
  });
}

export function lerUsuario(
  prisma: PrismaClient,
  id: string,
): Promise<UsuarioFixture> {
  return prisma.usuario.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      senha: true,
      tipo: true,
      ativo: true,
      empresaId: true,
      versaoAutorizacao: true,
      trocaSenhaObrigatoria: true,
    },
  });
}

export function comoAtor(
  usuario: UsuarioFixture,
  versao = usuario.versaoAutorizacao,
): AuthenticatedUser {
  return {
    id: usuario.id,
    email: usuario.email,
    tipo: usuario.tipo,
    empresaId: usuario.empresaId,
    versaoAutorizacao: versao,
  };
}

export async function criarSuperAdminFixture(
  contexto: ContextoReset,
  sufixo: string,
): Promise<UsuarioFixture> {
  const usuario = await criarUsuario(contexto.prisma, {
    empresaId: null,
    prefixo: contexto.prefixo,
    sufixo,
    tipo: UserType.SUPER_ADMIN,
    senha: contexto.senhaOriginalHash,
  });
  contexto.usuarios.push(usuario.id);
  return usuario;
}

export async function criarTokenRecuperacao(
  prisma: PrismaClient,
  userId: string,
  estado: EstadoTokenRecuperacao,
): Promise<void> {
  if (estado === 'nenhum') return;

  const agora = new Date();
  const expiradoEm = new Date(agora.getTime() - 60_000);

  if (estado === 'ativo') {
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashUnico('ativo'),
        expiresAt: new Date(agora.getTime() + 30 * 60_000),
      },
    });
    return;
  }

  if (estado === 'pendente') {
    await prisma.passwordResetToken.create({
      data: {
        userId,
        pendingTokenHash: hashUnico('pendente'),
        pendingExpiresAt: new Date(agora.getTime() + 10 * 60_000),
        pendingRequestId: randomUUID(),
        pendingCreatedAt: agora,
      },
    });
    return;
  }

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashUnico('consumido'),
      expiresAt: expiradoEm,
      usedAt: expiradoEm,
    },
  });
}

/**
 * Limpeza estritamente filtrada pelos IDs criados pela execução, respeitando
 * a ordem das FKs: auditoria -> tokens -> usuários -> empresa.
 */
export async function limparRegistros(
  prisma: PrismaClient,
  empresas: string[],
  usuarios: string[],
): Promise<void> {
  if (empresas.length === 0 && usuarios.length === 0) return;

  const filtrosAuditoria: Prisma.AuditoriaLogWhereInput[] = [];
  if (empresas.length > 0) {
    filtrosAuditoria.push({ empresaId: { in: empresas } });
  }
  if (usuarios.length > 0) {
    filtrosAuditoria.push(
      { usuarioId: { in: usuarios } },
      { entidade: 'Usuario', entidadeId: { in: usuarios } },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditoriaLog.deleteMany({ where: { OR: filtrosAuditoria } });
    if (usuarios.length > 0) {
      await tx.passwordResetToken.deleteMany({
        where: { userId: { in: usuarios } },
      });
      await tx.usuario.deleteMany({ where: { id: { in: usuarios } } });
    }
    if (empresas.length > 0) {
      await tx.empresa.deleteMany({ where: { id: { in: empresas } } });
    }
  });
}

export async function criarContextoReset(
  url: string,
  opcoes?: { clientesAuxiliares?: number },
): Promise<ContextoReset> {
  const todosClientes: PrismaClient[] = [];
  const empresasCriadas: string[] = [];
  const usuariosCriados: string[] = [];
  let identidadeValidada = false;
  let prisma: PrismaClient | undefined;

  try {
    // Cada cliente é registrado imediatamente após a criação: se um cliente
    // posterior falhar, todos os anteriores são desconectados no catch.
    prisma = criarClienteIntegracao(url);
    todosClientes.push(prisma);

    const auxiliares = Array.from(
      { length: opcoes?.clientesAuxiliares ?? 2 },
      () => {
        const cliente = criarClienteIntegracao(url);
        todosClientes.push(cliente);
        return cliente;
      },
    );

    // Valida a identidade em todos os clientes antes de qualquer escrita.
    for (const cliente of todosClientes) {
      await validarClienteIntegracao(cliente);
    }
    identidadeValidada = true;

    const runId = randomUUID();
    const prefixo = `${PREFIXO_FIXTURE}${runId}_`;
    const senhaOriginalHash = await bcrypt.hash(SENHA_ORIGINAL_FIXTURE, 4);

    const empresa = await prisma.empresa.create({
      data: { nome: `${prefixo}EMPRESA` },
    });
    empresasCriadas.push(empresa.id);

    const ator = await criarUsuario(prisma, {
      empresaId: null,
      prefixo,
      sufixo: 'ATOR',
      tipo: UserType.SUPER_ADMIN,
      senha: senhaOriginalHash,
    });
    usuariosCriados.push(ator.id);

    const alvo = await criarUsuario(prisma, {
      empresaId: empresa.id,
      prefixo,
      sufixo: 'ALVO',
      tipo: UserType.USUARIO_EMPRESA,
      senha: senhaOriginalHash,
    });
    usuariosCriados.push(alvo.id);

    return {
      url,
      prisma,
      auxiliares,
      todosClientes,
      runId,
      prefixo,
      empresaId: empresa.id,
      senhaOriginalHash,
      ator,
      alvo,
      usuarios: [...usuariosCriados],
    };
  } catch (erro) {
    let erroDeLimpeza: unknown;
    if (prisma && identidadeValidada) {
      try {
        await limparRegistros(prisma, empresasCriadas, usuariosCriados);
      } catch (falha) {
        erroDeLimpeza = falha;
      }
    }
    await desconectarClientes(todosClientes);
    if (erroDeLimpeza !== undefined) {
      throw anexarCausa(erro, erroDeLimpeza);
    }
    throw erro;
  }
}

export async function limparContexto(contexto: ContextoReset): Promise<void> {
  await limparRegistros(
    contexto.prisma,
    [contexto.empresaId],
    contexto.usuarios,
  );
}

/**
 * Cria o contexto, executa o callback e garante a limpeza no finally, mesmo
 * quando o teste falha. Os clientes são sempre encerrados ao final.
 *
 * Se o teste e a limpeza falharem, a exceção do teste permanece como principal
 * e a falha de limpeza é anexada como `cause`.
 */
export async function comContextoReset(
  url: string,
  callback: (contexto: ContextoReset) => Promise<void>,
  opcoes?: { clientesAuxiliares?: number },
): Promise<void> {
  const contexto = await criarContextoReset(url, opcoes);

  let erroDoTeste: unknown;
  let falhouTeste = false;
  try {
    await callback(contexto);
  } catch (erro) {
    falhouTeste = true;
    erroDoTeste = erro;
  }

  let erroDeLimpeza: unknown;
  let falhouLimpeza = false;
  try {
    await limparContexto(contexto);
  } catch (erro) {
    falhouLimpeza = true;
    erroDeLimpeza = erro;
  } finally {
    await desconectarClientes(contexto.todosClientes);
  }

  if (falhouTeste) {
    if (falhouLimpeza) throw anexarCausa(erroDoTeste, erroDeLimpeza);
    throw erroDoTeste;
  }
  if (falhouLimpeza) throw erroDeLimpeza;
}

export function criarContadorTentativas(): ContadorTentativas {
  let total = 0;
  return {
    registrar: () => {
      total += 1;
    },
    total: () => total,
  };
}

function instrumentarAuditoria(
  tx: Prisma.TransactionClient,
  aoCriar: () => never,
): Prisma.TransactionClient {
  return new Proxy(tx, {
    get(alvo, propriedade, receptor): unknown {
      if (propriedade !== 'auditoriaLog') {
        return Reflect.get(alvo, propriedade, receptor) as unknown;
      }
      const auditoria = Reflect.get(alvo, propriedade, receptor) as object;
      return new Proxy(auditoria, {
        get(alvoAuditoria, propAuditoria, receptorAuditoria): unknown {
          if (propAuditoria === 'create') return aoCriar;
          return Reflect.get(
            alvoAuditoria,
            propAuditoria,
            receptorAuditoria,
          ) as unknown;
        },
      });
    },
  });
}

function instrumentarConsulta(
  tx: Prisma.TransactionClient,
  ganchos: GanchosTransacao,
): Prisma.TransactionClient {
  if (!ganchos.aoIniciarQueryRaw && !ganchos.aposConcluirQueryRaw) {
    return tx;
  }

  let consultas = 0;
  return new Proxy(tx, {
    get(alvo, propriedade, receptor): unknown {
      if (propriedade !== '$queryRaw') {
        return Reflect.get(alvo, propriedade, receptor) as unknown;
      }
      const original = Reflect.get(alvo, propriedade, receptor) as (
        ...args: unknown[]
      ) => Promise<unknown>;
      return async (...args: unknown[]): Promise<unknown> => {
        consultas += 1;
        const indice = consultas;
        ganchos.aoIniciarQueryRaw?.(indice);
        const resultado = (await original.apply(alvo, args)) as unknown;
        await ganchos.aposConcluirQueryRaw?.(indice);
        return resultado;
      };
    },
  });
}

type OpcoesClienteServico = {
  instrumentar?: (tx: Prisma.TransactionClient) => Prisma.TransactionClient;
  aoIniciarTransacao?: (pid: number) => void;
  aoFalharTransacao?: (erro: unknown) => void;
  /**
   * Ajusta somente o timeout da transação interativa neste cenário. Usado
   * quando a transação precisa permanecer aberta durante a observação de
   * locks; não altera o serviço de produção nem os demais cenários.
   */
  tempoMaximoTransacaoMs?: number;
};

function montarClienteParaServico(
  prisma: PrismaClient,
  opcoes: OpcoesClienteServico = {},
): PrismaService {
  const executarTransacao = prisma.$transaction.bind(prisma) as unknown as (
    arg: unknown,
    opcoesTransacao?: OpcoesTransacao,
  ) => Promise<unknown>;
  const instrumentar = opcoes.instrumentar ?? ((tx) => tx);

  const cliente = {
    $transaction: (
      arg: unknown,
      opcoesTransacao?: OpcoesTransacao,
    ): Promise<unknown> => {
      const opcoesEfetivas =
        opcoes.tempoMaximoTransacaoMs === undefined
          ? opcoesTransacao
          : {
              ...(opcoesTransacao ?? {}),
              timeout: opcoes.tempoMaximoTransacaoMs,
            };
      const executar = async (): Promise<unknown> => {
        if (typeof arg !== 'function') {
          return executarTransacao(arg, opcoesEfetivas);
        }
        return executarTransacao(async (tx: Prisma.TransactionClient) => {
          // `SELECT pg_backend_pid()` confirma que o BEGIN foi enviado e aceito
          // pelo PostgreSQL e identifica a sessão exata desta transação. O
          // contador passa a medir transações realmente iniciadas, não chamadas
          // de fábrica.
          const [sessao] = await tx.$queryRaw<Array<{ pid: number }>>`
            SELECT pg_backend_pid()::int AS pid
          `;
          if (!sessao) {
            throw new Error(
              'pg_backend_pid() não retornou a sessão da transação.',
            );
          }
          opcoes.aoIniciarTransacao?.(Number(sessao.pid));
          return (arg as (t: Prisma.TransactionClient) => Promise<unknown>)(
            instrumentar(tx),
          );
        }, opcoesEfetivas);
      };
      return executar().catch((erro: unknown) => {
        opcoes.aoFalharTransacao?.(erro);
        throw erro;
      });
    },
  };

  return cliente as unknown as PrismaService;
}

export function criarServicoReset(prisma: PrismaClient): UsuariosService {
  return new UsuariosService(prisma as unknown as PrismaService);
}

export function criarServicoResetComContador(
  prisma: PrismaClient,
  contador: ContadorTentativas,
  observador?: ObservadorErros,
): UsuariosService {
  return new UsuariosService(
    montarClienteParaServico(prisma, {
      aoIniciarTransacao: contador.registrar,
      aoFalharTransacao: observador
        ? (erro) => observador.registrar(erro)
        : undefined,
    }),
  );
}

/**
 * Serviço real com ganchos de observação. Usado para sincronizar locks sem
 * sleeps: o teste sabe exatamente quando cada `$queryRaw` (lock) começou e
 * terminou dentro da transação real.
 */
export function criarServicoResetComGanchos(
  prisma: PrismaClient,
  ganchos: GanchosTransacao,
  opcoes?: { tempoMaximoTransacaoMs?: number },
): UsuariosService {
  return new UsuariosService(
    montarClienteParaServico(prisma, {
      instrumentar: (tx) => instrumentarConsulta(tx, ganchos),
      aoIniciarTransacao: ganchos.aoIniciarTransacao,
      aoFalharTransacao: ganchos.aoFalharTransacao,
      tempoMaximoTransacaoMs: opcoes?.tempoMaximoTransacaoMs,
    }),
  );
}

/**
 * Injeção controlada: a auditoria falha dentro da transação real do PostgreSQL,
 * permitindo comprovar o rollback integral das escritas anteriores.
 */
export function criarServicoResetComFalhaNaAuditoria(
  prisma: PrismaClient,
  erro: Error,
): UsuariosService {
  return new UsuariosService(
    montarClienteParaServico(prisma, {
      instrumentar: (tx) =>
        instrumentarAuditoria(tx, () => {
          throw erro;
        }),
    }),
  );
}

/**
 * Injeção controlada da classificação P2034 na auditoria. Cada tentativa
 * escreve senha/versão/token em transação real e sofre rollback ao falhar,
 * exercitando o retry e o esgotamento em três tentativas.
 */
export function criarServicoResetComP2034NaAuditoria(
  prisma: PrismaClient,
  contador: ContadorTentativas,
  observador?: ObservadorErros,
): UsuariosService {
  return new UsuariosService(
    montarClienteParaServico(prisma, {
      instrumentar: (tx) =>
        instrumentarAuditoria(tx, () => {
          throw new Prisma.PrismaClientKnownRequestError(
            'falha de serialização controlada',
            {
              code: 'P2034',
              clientVersion: 'integration-test',
              meta: { code: '40001' },
            },
          );
        }),
      aoIniciarTransacao: contador.registrar,
      aoFalharTransacao: observador
        ? (erro) => observador.registrar(erro)
        : undefined,
    }),
  );
}

/**
 * RecoveryService com envio de e-mail stub. O banco e a auditoria são reais.
 */
export function criarServicoRecuperacao(prisma: PrismaClient): RecoveryService {
  const mailService = {
    sendPasswordResetEmail: () => Promise.resolve(),
  };
  return new RecoveryService(
    prisma as unknown as PrismaService,
    mailService as unknown as MailService,
    new AuditoriaService(prisma as unknown as PrismaService),
  );
}
