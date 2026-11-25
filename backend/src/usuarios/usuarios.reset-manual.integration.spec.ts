import {
  ConflictException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  BANCO_INTEGRACAO,
  clientVersionDoErro,
  codigoDoErro,
  comContextoReset,
  comoAtor,
  criarContadorTentativas,
  criarObservadorErros,
  criarServicoRecuperacao,
  criarServicoReset,
  criarServicoResetComFalhaNaAuditoria,
  criarServicoResetComGanchos,
  criarServicoResetComP2034NaAuditoria,
  criarSuperAdminFixture,
  criarTokenRecuperacao,
  integracaoHabilitada,
  lerUsuario,
  obterUrlIntegracao,
  sqlStateDoErro,
  type ContextoReset,
  type GanchosTransacao,
  type ResultadoReset,
  type UsuarioFixture,
} from './testing/reset-manual-database-fixtures';

const executarIntegracao = integracaoHabilitada() ? describe : describe.skip;

const IP = '203.0.113.10';

type Sinal = { promessa: Promise<void>; resolver: () => void };

function criarSinal(): Sinal {
  let resolver!: () => void;
  const promessa = new Promise<void>((resolverInterno) => {
    resolver = resolverInterno;
  });
  return { promessa, resolver };
}

/**
 * Limite de espera por um sinal. Não é usado como prova de lock: apenas evita
 * que um teste fique pendurado indefinidamente quando o sinal esperado nunca
 * ocorre. O temporizador é cancelado e não mantém o processo vivo.
 */
async function comLimite<T>(
  promessa: Promise<T>,
  ms: number,
  mensagem: string,
): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promessa,
      new Promise<never>((_, rejeitar) => {
        temporizador = setTimeout(() => rejeitar(new Error(mensagem)), ms);
        temporizador.unref();
      }),
    ]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

function validarPoliticaSenha(senha: string): void {
  expect(senha.length).toBeGreaterThanOrEqual(16);
  expect(senha).toMatch(/[a-z]/);
  expect(senha).toMatch(/[A-Z]/);
  expect(senha).toMatch(/[0-9]/);
  expect(senha).toMatch(/[^A-Za-z0-9]/);
}

async function capturarErro(promessa: Promise<unknown>): Promise<unknown> {
  try {
    await promessa;
  } catch (erro) {
    return erro;
  }
  throw new Error('Esperava uma falha, mas a operação concluiu com sucesso.');
}

type ResultadoExecucao<T> =
  | { status: 'sucesso'; valor: T }
  | { status: 'erro'; erro: unknown };

function capturarResultado<T>(
  promessa: Promise<T>,
): Promise<ResultadoExecucao<T>> {
  return promessa.then(
    (valor): ResultadoExecucao<T> => ({ status: 'sucesso', valor }),
    (erro: unknown): ResultadoExecucao<T> => ({ status: 'erro', erro }),
  );
}

function respostaDe(erro: unknown): Record<string, unknown> {
  if (erro instanceof HttpException) {
    return erro.getResponse() as Record<string, unknown>;
  }
  throw erro;
}

function contarAuditoriasReset(
  contexto: ContextoReset,
  alvoId: string,
): Promise<number> {
  return contexto.prisma.auditoriaLog.count({
    where: {
      entidade: 'Usuario',
      entidadeId: alvoId,
      acao: 'RESET_SENHA_MANUAL',
    },
  });
}

function atorDe(usuario: UsuarioFixture, versao?: number) {
  return comoAtor(usuario, versao);
}

/**
 * `pg_stat_database.deadlocks` é cumulativo e global ao banco. Os cenários
 * controlados exigem delta exato de 1 e pressupõem o banco de integração
 * exclusivo da suíte durante a execução. O contador, sozinho, não identifica a
 * transação responsável pelo deadlock.
 */
async function lerDeadlocks(prisma: PrismaClient): Promise<number> {
  const [linha] = await prisma.$queryRaw<Array<{ deadlocks: bigint }>>`
    SELECT deadlocks FROM pg_stat_database WHERE datname = current_database()
  `;
  if (!linha) {
    throw new Error('pg_stat_database não retornou a linha do banco atual.');
  }
  return Number(linha.deadlocks);
}

async function aguardarDeadlocksAcimaDe(
  prisma: PrismaClient,
  valorInicial: number,
  timeoutMs = 10_000,
): Promise<number> {
  const prazo = Date.now() + timeoutMs;
  for (;;) {
    const atual = await lerDeadlocks(prisma);
    if (atual > valorInicial) return atual;
    if (Date.now() > prazo) {
      throw new Error(
        `Nenhum deadlock registrado em pg_stat_database (${atual}).`,
      );
    }
    await new Promise<void>((resolver) => setTimeout(resolver, 50));
  }
}

type SessaoPg = {
  pid: number;
  estado: string | null;
  tipoDeEspera: string | null;
  eventoDeEspera: string | null;
  bloqueadores: number[];
  consulta: string | null;
};

/**
 * Lê a sessão exata pelo PID em pg_stat_activity. `pg_blocking_pids()` resolve
 * a cadeia de bloqueio sem depender de `pg_locks.relation`, que é NULL para
 * espera por lock de linha (`SELECT ... FOR UPDATE`): nesse caso o waiter
 * aparece como `locktype = 'transactionid'`.
 */
async function lerSessaoPg(
  prisma: PrismaClient,
  pid: number,
): Promise<SessaoPg | null> {
  const [linha] = await prisma.$queryRaw<
    Array<{
      pid: number;
      estado: string | null;
      tipoDeEspera: string | null;
      eventoDeEspera: string | null;
      bloqueadores: string | null;
      consulta: string | null;
    }>
  >`
    SELECT
      a.pid,
      a.state AS "estado",
      a.wait_event_type AS "tipoDeEspera",
      a.wait_event AS "eventoDeEspera",
      array_to_string(pg_blocking_pids(a.pid), ',') AS "bloqueadores",
      a.query AS "consulta"
    FROM pg_stat_activity a
    WHERE a.datname = current_database()
      AND a.pid = ${pid}
  `;
  if (!linha) return null;
  return {
    pid: Number(linha.pid),
    estado: linha.estado,
    tipoDeEspera: linha.tipoDeEspera,
    eventoDeEspera: linha.eventoDeEspera,
    bloqueadores: (linha.bloqueadores ?? '')
      .split(',')
      .filter((valor) => valor.length > 0)
      .map(Number),
    consulta: linha.consulta,
  };
}

function ehLockDeUsuarioForUpdate(consulta: string | null): boolean {
  if (!consulta) return false;
  return /FROM\s+"Usuario"/i.test(consulta) && /FOR\s+UPDATE/i.test(consulta);
}

/**
 * Prova de sobreposição real: aguarda a segunda sessão aparecer em
 * pg_stat_activity com `wait_event_type = 'Lock'`, bloqueada pelo PID da
 * primeira, com a consulta bloqueada sendo o `FOR UPDATE` sobre "Usuario".
 * Não usa `pg_locks.relation` nem temporização como prova.
 */
async function aguardarSobreposicaoDeLocks(
  prisma: PrismaClient,
  pidBloqueado: number,
  pidBloqueador: number,
  timeoutMs = 5_000,
): Promise<SessaoPg> {
  const prazo = Date.now() + timeoutMs;
  let ultima: SessaoPg | null = null;
  for (;;) {
    ultima = await lerSessaoPg(prisma, pidBloqueado);
    if (
      ultima &&
      ultima.tipoDeEspera === 'Lock' &&
      ultima.bloqueadores.includes(pidBloqueador) &&
      ehLockDeUsuarioForUpdate(ultima.consulta)
    ) {
      return ultima;
    }
    if (Date.now() > prazo) {
      throw new Error(
        `Timeout aguardando sobreposição de locks: sessão ${pidBloqueado} não ficou bloqueada por ${pidBloqueador} em "Usuario" (estado=${ultima?.estado ?? 'ausente'}, espera=${ultima?.tipoDeEspera ?? 'nenhuma'}/${ultima?.eventoDeEspera ?? 'nenhum'}, bloqueadores=[${ultima?.bloqueadores.join(',') ?? ''}]).`,
      );
    }
    await new Promise<void>((resolver) => setTimeout(resolver, 25));
  }
}

/**
 * Confirma que o PID da primeira operação continua dentro da transação que
 * adquiriu o lock do ator, com o `FOR UPDATE` sobre "Usuario" como última
 * consulta executada.
 */
async function exigirSessaoDentroDaTransacao(
  prisma: PrismaClient,
  pid: number,
): Promise<void> {
  const sessao = await lerSessaoPg(prisma, pid);
  expect(sessao).not.toBeNull();
  expect(['active', 'idle in transaction']).toContain(sessao?.estado);
  expect(ehLockDeUsuarioForUpdate(sessao?.consulta ?? null)).toBe(true);
}

function exigirErro<T>(
  resultado: ResultadoExecucao<T>,
): Extract<ResultadoExecucao<T>, { status: 'erro' }> {
  if (resultado.status !== 'erro') {
    throw new Error('Esperava uma falha, mas a operação concluiu com sucesso.');
  }
  return resultado;
}

function exigirSucesso<T>(
  resultado: ResultadoExecucao<T>,
): Extract<ResultadoExecucao<T>, { status: 'sucesso' }> {
  if (resultado.status !== 'sucesso') {
    throw new Error('Esperava sucesso, mas a operação falhou.');
  }
  return resultado;
}

function ganchosDeContagem(
  contador: { registrar: () => void },
  observador: { registrar: (erro: unknown) => void },
  extras: Partial<GanchosTransacao> = {},
): GanchosTransacao {
  return {
    aoIniciarTransacao: contador.registrar,
    aoFalharTransacao: (erro) => observador.registrar(erro),
    ...extras,
  };
}

/**
 * Suíte de integração de SERVIÇO com PostgreSQL real, isolada do banco
 * sistema_gestao_teste. Não há HTTP nem mocks de Prisma/serviço aqui: o 201/409
 * HTTP é coberto por test/usuarios-reset-manual.e2e-spec.ts, que usa mocks.
 *
 * Pré-requisitos:
 *   - RUN_RESET_INTEGRATION_TESTS=true
 *   - INTEGRATION_DATABASE_URL apontando para sistema_gestao_integracao
 *   - schema public com migrations aplicadas manualmente (a suíte não aplica)
 *   - banco exclusivo da suíte durante a execução: o contador
 *     pg_stat_database.deadlocks é global ao banco
 *
 * Execução recomendada (uma suíte contra o banco, sem paralelismo):
 *   npx jest src/usuarios/usuarios.reset-manual.integration.spec.ts --runInBand
 * Na primeira execução real, acrescentar --detectOpenHandles.
 */
executarIntegracao(
  'Reset manual — serviço com PostgreSQL real (integração isolada)',
  () => {
    jest.setTimeout(180_000);

    let url: string;

    beforeAll(() => {
      url = obterUrlIntegracao();
    });

    describe('reset e integridade', () => {
      it.each(['nenhum', 'ativo', 'pendente', 'consumido'] as const)(
        'conclui o reset com token %s e remove o estado de recuperação',
        async (estado) => {
          await comContextoReset(url, async (contexto) => {
            if (estado !== 'nenhum') {
              await criarTokenRecuperacao(
                contexto.prisma,
                contexto.alvo.id,
                estado,
              );
            }

            expect(
              await contexto.prisma.passwordResetToken.count({
                where: { userId: contexto.alvo.id },
              }),
            ).toBe(estado === 'nenhum' ? 0 : 1);

            const resultado = await criarServicoReset(
              contexto.prisma,
            ).resetarSenhaAdministrativaManual(
              contexto.alvo.id,
              atorDe(contexto.ator),
              0,
              IP,
            );

            expect(resultado).toMatchObject({
              usuarioId: contexto.alvo.id,
              email: contexto.alvo.email,
              versaoAutorizacao: 1,
            });
            validarPoliticaSenha(resultado.senhaTemporaria);

            const atualizado = await lerUsuario(
              contexto.prisma,
              contexto.alvo.id,
            );
            expect(atualizado.trocaSenhaObrigatoria).toBe(true);
            expect(atualizado.versaoAutorizacao).toBe(1);
            expect(atualizado.senha).not.toBe(resultado.senhaTemporaria);
            await expect(
              bcrypt.compare(resultado.senhaTemporaria, atualizado.senha),
            ).resolves.toBe(true);

            expect(
              await contexto.prisma.passwordResetToken.count({
                where: { userId: contexto.alvo.id },
              }),
            ).toBe(0);

            const auditorias = await contexto.prisma.auditoriaLog.findMany({
              where: {
                entidade: 'Usuario',
                entidadeId: contexto.alvo.id,
                acao: 'RESET_SENHA_MANUAL',
              },
            });
            expect(auditorias).toHaveLength(1);
            expect(auditorias[0]).toMatchObject({
              empresaId: contexto.empresaId,
              usuarioId: contexto.ator.id,
              ip: IP,
            });
            const serializado = JSON.stringify(auditorias[0]);
            expect(serializado).not.toContain(resultado.senhaTemporaria);
            expect(serializado).not.toContain(atualizado.senha);
          });
        },
      );

      it('respeita as constraints reais de estado do token', async () => {
        await comContextoReset(url, async (contexto) => {
          const userId = contexto.alvo.id;

          await expect(
            contexto.prisma.passwordResetToken.create({
              data: { userId, usedAt: new Date() },
            }),
          ).rejects.toThrow(/PasswordResetToken_used_requires_active_check/);

          await expect(
            contexto.prisma.passwordResetToken.create({
              data: { userId, tokenHash: 'hash-sem-expiracao' },
            }),
          ).rejects.toThrow(/PasswordResetToken_active_pair_check/);

          await expect(
            contexto.prisma.passwordResetToken.create({
              data: { userId, pendingTokenHash: 'hash-pendente-incompleto' },
            }),
          ).rejects.toThrow(/PasswordResetToken_pending_set_check/);

          expect(
            await contexto.prisma.passwordResetToken.count({
              where: { userId },
            }),
          ).toBe(0);
        });
      });
    });

    describe('atomicidade (injeção controlada em transação PostgreSQL real)', () => {
      it('faz rollback integral quando a auditoria falha', async () => {
        await comContextoReset(url, async (contexto) => {
          await criarTokenRecuperacao(
            contexto.prisma,
            contexto.alvo.id,
            'ativo',
          );

          const erro = await capturarErro(
            criarServicoResetComFalhaNaAuditoria(
              contexto.prisma,
              new Error('falha controlada de auditoria'),
            ).resetarSenhaAdministrativaManual(
              contexto.alvo.id,
              atorDe(contexto.ator),
              0,
              IP,
            ),
          );

          expect(String(erro)).toContain('falha controlada de auditoria');

          const alvo = await lerUsuario(contexto.prisma, contexto.alvo.id);
          expect(alvo).toMatchObject({
            senha: contexto.senhaOriginalHash,
            versaoAutorizacao: 0,
            trocaSenhaObrigatoria: false,
          });
          expect(
            await contexto.prisma.passwordResetToken.count({
              where: { userId: contexto.alvo.id },
            }),
          ).toBe(1);
          expect(await contarAuditoriasReset(contexto, contexto.alvo.id)).toBe(
            0,
          );
        });
      });
    });

    describe('concorrência (serviço com PostgreSQL real)', () => {
      it('exclusão mútua com sobreposição comprovada por pg_stat_activity e pg_blocking_pids: uma vence, a outra recebe 409', async () => {
        await comContextoReset(url, async (contexto) => {
          const observadorPrimeira = criarObservadorErros();
          const observadorSegunda = criarObservadorErros();
          const primeiraNoLock = criarSinal();
          const segundaIniciouLock = criarSinal();
          const segundaAdquiriuLock = { valor: false };
          let pidPrimeira: number | undefined;
          let pidSegunda: number | undefined;
          let liberarPrimeira!: () => void;
          const pausaLiberada = new Promise<void>((resolver) => {
            liberarPrimeira = resolver;
          });

          const pendentes: Array<Promise<unknown>> = [];
          try {
            const primeira = capturarResultado(
              criarServicoResetComGanchos(
                contexto.prisma,
                {
                  aoIniciarTransacao: (pid) => {
                    pidPrimeira = pid;
                  },
                  aoFalharTransacao: observadorPrimeira.registrar,
                  aposConcluirQueryRaw: async (indice) => {
                    if (indice !== 1) return;
                    // Lock de ator adquirido: mantém a transação aberta até que
                    // a segunda operação prove que está disputando o mesmo lock.
                    primeiraNoLock.resolver();
                    await pausaLiberada;
                  },
                },
                // A comprovação da espera precisa ocorrer com esta transação
                // ainda aberta: 20 s de transação > 5 s do helper. Se a espera
                // não for observada, o teste falha na observação — não por
                // expiração da transação.
                { tempoMaximoTransacaoMs: 20_000 },
              ).resetarSenhaAdministrativaManual(
                contexto.alvo.id,
                atorDe(contexto.ator),
                0,
                IP,
              ),
            );
            pendentes.push(primeira);

            await comLimite(
              primeiraNoLock.promessa,
              10_000,
              'A primeira operação não adquiriu o lock do ator.',
            );

            const segunda = capturarResultado(
              criarServicoResetComGanchos(
                contexto.auxiliares[0],
                {
                  aoIniciarTransacao: (pid) => {
                    pidSegunda = pid;
                  },
                  aoIniciarQueryRaw: (indice) => {
                    if (indice === 1) segundaIniciouLock.resolver();
                  },
                  aposConcluirQueryRaw: (indice) => {
                    if (indice === 1) segundaAdquiriuLock.valor = true;
                  },
                  aoFalharTransacao: observadorSegunda.registrar,
                },
                { tempoMaximoTransacaoMs: 20_000 },
              ).resetarSenhaAdministrativaManual(
                contexto.alvo.id,
                atorDe(contexto.ator),
                0,
                IP,
              ),
            );
            pendentes.push(segunda);

            await comLimite(
              segundaIniciouLock.promessa,
              10_000,
              'A segunda operação não iniciou a disputa pelo lock do ator.',
            );
            const pidBloqueador = pidPrimeira;
            const pidBloqueado = pidSegunda;
            if (pidBloqueador === undefined || pidBloqueado === undefined) {
              throw new Error(
                'PIDs das transações concorrentes não foram capturados.',
              );
            }
            expect(pidBloqueado).not.toBe(pidBloqueador);

            // Sobreposição real: a segunda sessão está bloqueada pelo PID da
            // primeira, aguardando o FOR UPDATE sobre "Usuario".
            await aguardarSobreposicaoDeLocks(
              contexto.auxiliares[1],
              pidBloqueado,
              pidBloqueador,
            );
            // A primeira continua dentro da transação que detém o lock.
            await exigirSessaoDentroDaTransacao(
              contexto.auxiliares[1],
              pidBloqueador,
            );
            expect(segundaAdquiriuLock.valor).toBe(false);

            liberarPrimeira();

            const resultados = await Promise.all([primeira, segunda]);
            const sucessos = resultados.filter(
              (resultado) => resultado.status === 'sucesso',
            );
            const falhas = resultados.filter(
              (resultado) => resultado.status === 'erro',
            );

            expect(sucessos).toHaveLength(1);
            expect(falhas).toHaveLength(1);

            const sucesso = exigirSucesso(sucessos[0]);
            const falha = exigirErro(falhas[0]);
            const erro = falha.erro;
            expect(erro).toBeInstanceOf(ConflictException);
            expect(respostaDe(erro)).toMatchObject({
              error: 'RESET_CONCORRENTE',
            });
            expect(respostaDe(erro)).not.toHaveProperty('senhaTemporaria');

            const vencedor = sucesso.valor;
            const alvo = await lerUsuario(contexto.prisma, contexto.alvo.id);
            expect(alvo.versaoAutorizacao).toBe(1);
            await expect(
              bcrypt.compare(vencedor.senhaTemporaria, alvo.senha),
            ).resolves.toBe(true);

            expect(
              await contarAuditoriasReset(contexto, contexto.alvo.id),
            ).toBe(1);
            expect(
              await contexto.prisma.passwordResetToken.count({
                where: { userId: contexto.alvo.id },
              }),
            ).toBe(0);

            // A vencedora não registra nenhuma falha de transação.
            expect(observadorPrimeira.erros()).toHaveLength(0);

            // A perdedora pode retentar por conflito de serialização
            // (40001/40P01/P2034), comportamento previsto do serviço. Nenhum
            // timeout (P2028) ou erro de origem artificial é aceito, e a
            // última falha registrada é o conflito de negócio (409), sem
            // código Prisma.
            const errosSegunda = observadorSegunda.erros();
            const errosPrismaSegunda = errosSegunda.filter(
              (registro) => registro.codigo !== null,
            );
            expect(
              errosPrismaSegunda.every(
                (registro) =>
                  registro.clientVersion !== 'integration-test' &&
                  (registro.codigo === 'P2034' ||
                    (registro.codigo === 'P2010' &&
                      ['40001', '40P01'].includes(registro.sqlstate ?? ''))),
              ),
            ).toBe(true);
            expect(errosSegunda[errosSegunda.length - 1]).toEqual({
              codigo: null,
              sqlstate: null,
              clientVersion: null,
            });
          } finally {
            liberarPrimeira();
            await Promise.allSettled(pendentes);
          }
        });
      });

      it('conflito sequencial: segundo reset com versão antiga não invalida a credencial do primeiro', async () => {
        await comContextoReset(url, async (contexto) => {
          const primeiro = await criarServicoReset(
            contexto.prisma,
          ).resetarSenhaAdministrativaManual(
            contexto.alvo.id,
            atorDe(contexto.ator),
            0,
            IP,
          );

          const erro = await capturarErro(
            criarServicoReset(
              contexto.auxiliares[0],
            ).resetarSenhaAdministrativaManual(
              contexto.alvo.id,
              atorDe(contexto.ator),
              0,
              IP,
            ),
          );

          expect(erro).toBeInstanceOf(ConflictException);
          expect(respostaDe(erro)).toMatchObject({
            error: 'RESET_CONCORRENTE',
          });

          const alvo = await lerUsuario(contexto.prisma, contexto.alvo.id);
          expect(alvo.versaoAutorizacao).toBe(1);
          await expect(
            bcrypt.compare(primeiro.senhaTemporaria, alvo.senha),
          ).resolves.toBe(true);
          expect(await contarAuditoriasReset(contexto, contexto.alvo.id)).toBe(
            1,
          );
        });
      });

      it('rejeita o reset quando o ator é revogado com a transação bloqueada', async () => {
        await comContextoReset(url, async (contexto) => {
          let liberarBloqueador!: () => void;
          const liberado = new Promise<void>((resolver) => {
            liberarBloqueador = resolver;
          });
          const travado = criarSinal();

          const bloqueador = contexto.auxiliares[0].$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${contexto.ator.id} FOR UPDATE`;
            travado.resolver();
            await liberado;
            await tx.usuario.update({
              where: { id: contexto.ator.id },
              data: { versaoAutorizacao: { increment: 1 } },
            });
          });

          const iniciouReset = criarSinal();
          const pendentes: Array<Promise<unknown>> = [];
          try {
            await comLimite(
              travado.promessa,
              10_000,
              'O bloqueador não adquiriu o lock do ator.',
            );

            const execucao = capturarResultado(
              criarServicoResetComGanchos(contexto.prisma, {
                aoIniciarQueryRaw: (indice) => {
                  if (indice === 1) iniciouReset.resolver();
                },
              }).resetarSenhaAdministrativaManual(
                contexto.alvo.id,
                atorDe(contexto.ator),
                0,
                IP,
              ),
            );
            pendentes.push(execucao);

            await comLimite(
              iniciouReset.promessa,
              10_000,
              'O reset não iniciou o lock do ator.',
            );

            liberarBloqueador();
            await bloqueador;

            const resultado = exigirErro(await execucao);
            expect(resultado.erro).toBeInstanceOf(UnauthorizedException);

            const alvo = await lerUsuario(contexto.prisma, contexto.alvo.id);
            expect(alvo).toMatchObject({
              senha: contexto.senhaOriginalHash,
              versaoAutorizacao: 0,
              trocaSenhaObrigatoria: false,
            });
            expect(
              await contarAuditoriasReset(contexto, contexto.alvo.id),
            ).toBe(0);
          } finally {
            liberarBloqueador();
            await Promise.allSettled([bloqueador, ...pendentes]);
          }
        });
      });

      it('concorre com a recuperação por e-mail sem estado parcial', async () => {
        await comContextoReset(url, async (contexto) => {
          const reset = capturarResultado(
            criarServicoReset(contexto.prisma).resetarSenhaAdministrativaManual(
              contexto.alvo.id,
              atorDe(contexto.ator),
              0,
              IP,
            ),
          );
          const recuperacao = capturarResultado(
            criarServicoRecuperacao(
              contexto.auxiliares[0],
            ).solicitarRecuperacao(contexto.alvo.email, IP),
          );

          const [resultadoReset, resultadoRecuperacao] = await Promise.all([
            reset,
            recuperacao,
          ]);
          expect(resultadoRecuperacao.status).toBe('sucesso');

          const sucesso = exigirSucesso(resultadoReset);
          const alvo = await lerUsuario(contexto.prisma, contexto.alvo.id);
          expect(alvo.versaoAutorizacao).toBe(1);
          await expect(
            bcrypt.compare(sucesso.valor.senhaTemporaria, alvo.senha),
          ).resolves.toBe(true);
          expect(await contarAuditoriasReset(contexto, contexto.alvo.id)).toBe(
            1,
          );

          const token = await contexto.prisma.passwordResetToken.findUnique({
            where: { userId: contexto.alvo.id },
          });
          if (token) {
            expect(token.usedAt).toBeNull();
            const preenchidos = [
              token.pendingTokenHash,
              token.pendingExpiresAt,
              token.pendingRequestId,
              token.pendingCreatedAt,
            ].filter((valor) => valor !== null);
            expect([0, 4]).toContain(preenchidos.length);
          }
        });
      });

      it('deadlock real: pg_stat_database registra deadlock e o serviço faz retry até o estado final coerente', async () => {
        await comContextoReset(
          url,
          async (contexto) => {
            const par = await criarSuperAdminFixture(contexto, 'PAR');
            const observadorPrimeira = criarObservadorErros();
            const observadorSegunda = criarObservadorErros();
            const contadorPrimeira = criarContadorTentativas();
            const contadorSegunda = criarContadorTentativas();
            const deadlocksAntes = await lerDeadlocks(contexto.auxiliares[3]);

            const travadoA = criarSinal();
            const travadoB = criarSinal();
            const primeiraNoLock = criarSinal();
            const segundaNoLock = criarSinal();
            const primeiraSegundoLock = criarSinal();
            let liberarA!: () => void;
            let liberarB!: () => void;
            const liberadoA = new Promise<void>((resolver) => {
              liberarA = resolver;
            });
            const liberadoB = new Promise<void>((resolver) => {
              liberarB = resolver;
            });

            const bloqueioA = contexto.auxiliares[0].$transaction(
              async (tx) => {
                await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${contexto.ator.id} FOR UPDATE`;
                travadoA.resolver();
                await liberadoA;
              },
            );
            const bloqueioB = contexto.auxiliares[1].$transaction(
              async (tx) => {
                await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${par.id} FOR UPDATE`;
                travadoB.resolver();
                await liberadoB;
              },
            );

            let primeiro:
              | Promise<ResultadoExecucao<ResultadoReset>>
              | undefined;
            let segundo: Promise<ResultadoExecucao<ResultadoReset>> | undefined;

            try {
              await comLimite(
                Promise.all([travadoA.promessa, travadoB.promessa]),
                10_000,
                'Os bloqueadores não adquiriram os locks iniciais.',
              );

              primeiro = capturarResultado(
                criarServicoResetComGanchos(
                  contexto.prisma,
                  ganchosDeContagem(contadorPrimeira, observadorPrimeira, {
                    aoIniciarQueryRaw: (indice) => {
                      if (indice === 1) primeiraNoLock.resolver();
                      if (indice === 2) primeiraSegundoLock.resolver();
                    },
                  }),
                ).resetarSenhaAdministrativaManual(
                  par.id,
                  atorDe(contexto.ator),
                  0,
                  IP,
                ),
              );
              segundo = capturarResultado(
                criarServicoResetComGanchos(
                  contexto.auxiliares[2],
                  ganchosDeContagem(contadorSegunda, observadorSegunda, {
                    aoIniciarQueryRaw: (indice) => {
                      if (indice === 1) segundaNoLock.resolver();
                    },
                  }),
                ).resetarSenhaAdministrativaManual(
                  contexto.ator.id,
                  atorDe(par),
                  0,
                  IP,
                ),
              );

              await comLimite(
                Promise.all([primeiraNoLock.promessa, segundaNoLock.promessa]),
                10_000,
                'As duas operações não iniciaram seus locks iniciais.',
              );

              // Libera o lock de "ator": a primeira operação passa a disputar
              // "par", que continua bloqueado por B.
              liberarA();
              await comLimite(
                primeiraSegundoLock.promessa,
                10_000,
                'A primeira operação não passou a disputar o segundo lock.',
              );

              // Agora a segunda adquire "par" e tenta "ator" (mantido pela
              // primeira): ciclo completo, sem depender de FIFO ou de sleep.
              liberarB();

              const resultados = await Promise.all([primeiro, segundo]);
              const deadlocksDepois = await aguardarDeadlocksAcimaDe(
                contexto.auxiliares[3],
                deadlocksAntes,
              );
              // Delta exato, conservador: exatamente um deadlock na janela.
              // O contador é global ao banco e não identifica sozinho a
              // transação responsável; a atribuição vem dos erros individuais
              // observados em cada operação.
              expect(deadlocksDepois - deadlocksAntes).toBe(1);

              const operacoes = [
                {
                  resultado: resultados[0],
                  contador: contadorPrimeira,
                  observador: observadorPrimeira,
                },
                {
                  resultado: resultados[1],
                  contador: contadorSegunda,
                  observador: observadorSegunda,
                },
              ];
              const vencedoras = operacoes.filter(
                (operacao) => operacao.resultado.status === 'sucesso',
              );
              const perdedoras = operacoes.filter(
                (operacao) => operacao.resultado.status === 'erro',
              );
              expect(vencedoras).toHaveLength(1);
              expect(perdedoras).toHaveLength(1);

              const vencedora = vencedoras[0];
              const perdedora = perdedoras[0];
              const sucesso = exigirSucesso(vencedora.resultado);
              const falha = exigirErro(perdedora.resultado);
              const erro = falha.erro;
              expect(erro).toBeInstanceOf(HttpException);
              const status = (erro as HttpException).getStatus();
              expect([401, 409, 503]).toContain(status);
              if (status === 409) {
                expect(respostaDe(erro)).toMatchObject({
                  error: 'RESET_CONCORRENTE',
                });
              }

              // Evidência individual da perdedora: retry/esgotamento medido
              // pelo contador da própria operação (o da vencedora não pode
              // satisfazer esta asserção) e erro Prisma efetivamente recebido
              // nas tentativas dela.
              expect(perdedora.contador.total()).toBeGreaterThan(1);
              if (status === 503) {
                expect(perdedora.contador.total()).toBe(3);
              }
              const errosPrismaPerdedora = perdedora.observador
                .erros()
                .filter((registro) => registro.codigo !== null);
              expect(errosPrismaPerdedora.length).toBeGreaterThanOrEqual(1);
              expect(
                errosPrismaPerdedora.every(
                  (registro) =>
                    registro.sqlstate === null ||
                    ['40P01', '40001'].includes(registro.sqlstate),
                ),
              ).toBe(true);
              expect(
                errosPrismaPerdedora.some(
                  (registro) =>
                    registro.sqlstate === '40P01' ||
                    registro.codigo === 'P2034',
                ),
              ).toBe(true);

              // Nenhum erro real pode ter origem na injeção artificial.
              expect(
                [
                  ...observadorPrimeira.erros(),
                  ...observadorSegunda.erros(),
                ].every(
                  (registro) => registro.clientVersion !== 'integration-test',
                ),
              ).toBe(true);

              // Estado final: exatamente uma alteração, exatamente uma
              // auditoria e apenas a senha do vencedor é válida.
              const vencedorId = sucesso.valor.usuarioId;
              const perdedorId =
                vencedorId === contexto.ator.id ? par.id : contexto.ator.id;
              const vencedor = await lerUsuario(contexto.prisma, vencedorId);
              const perdedor = await lerUsuario(contexto.prisma, perdedorId);

              expect(vencedor.versaoAutorizacao).toBe(1);
              expect(perdedor.versaoAutorizacao).toBe(0);
              expect(
                vencedor.versaoAutorizacao + perdedor.versaoAutorizacao,
              ).toBe(1);
              await expect(
                bcrypt.compare(sucesso.valor.senhaTemporaria, vencedor.senha),
              ).resolves.toBe(true);
              expect(perdedor.senha).toBe(contexto.senhaOriginalHash);
              expect(await contarAuditoriasReset(contexto, vencedorId)).toBe(1);
              expect(await contarAuditoriasReset(contexto, perdedorId)).toBe(0);
              expect(
                await contexto.prisma.passwordResetToken.count({
                  where: { userId: { in: [vencedorId, perdedorId] } },
                }),
              ).toBe(0);
            } finally {
              liberarA();
              liberarB();
              await Promise.allSettled([
                bloqueioA,
                bloqueioB,
                primeiro,
                segundo,
              ]);
            }
          },
          { clientesAuxiliares: 4 },
        );
      }, 180_000);
    });

    describe('comprovação SQL independente (sem o serviço)', () => {
      it('deadlock entre duas transações cruas: SQLSTATE 40P01 em meta.code quando exposto, ou código Prisma P2034', async () => {
        await comContextoReset(
          url,
          async (contexto) => {
            const deadlocksAntes = await lerDeadlocks(contexto.auxiliares[2]);
            const noA = criarSinal();
            const noB = criarSinal();
            let liberar!: () => void;
            const liberado = new Promise<void>((resolver) => {
              liberar = resolver;
            });

            const transacaoA = capturarResultado(
              contexto.auxiliares[0].$transaction(
                async (tx) => {
                  await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${contexto.ator.id} FOR UPDATE`;
                  noA.resolver();
                  await liberado;
                  await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${contexto.alvo.id} FOR UPDATE`;
                },
                {
                  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                },
              ),
            );
            const transacaoB = capturarResultado(
              contexto.auxiliares[1].$transaction(
                async (tx) => {
                  await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${contexto.alvo.id} FOR UPDATE`;
                  noB.resolver();
                  await liberado;
                  await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${contexto.ator.id} FOR UPDATE`;
                },
                {
                  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                },
              ),
            );

            try {
              await comLimite(
                Promise.all([noA.promessa, noB.promessa]),
                10_000,
                'As transações cruas não adquiriram o primeiro lock.',
              );
              liberar();

              const resultados = await Promise.all([transacaoA, transacaoB]);
              const falhas = resultados.filter(
                (resultado) => resultado.status === 'erro',
              );
              expect(falhas).toHaveLength(1);

              const falha = exigirErro(falhas[0]);
              // SQLSTATE observado diretamente em meta.code (quando exposto);
              // nunca inferido a partir do código Prisma.
              const sqlstate = sqlStateDoErro(falha.erro);
              const codigo = codigoDoErro(falha.erro);

              expect(sqlstate === null || sqlstate === '40P01').toBe(true);
              if (sqlstate === null) {
                // SQLSTATE ausente em meta.code: preserva-se a ausência e
                // aceita-se apenas o P2034 efetivamente observado neste
                // conflito. Não há equivalência universal entre P2034 e
                // SQLSTATE.
                expect(codigo).toBe('P2034');
              }
              expect(clientVersionDoErro(falha.erro)).not.toBe(
                'integration-test',
              );

              const deadlocksDepois = await aguardarDeadlocksAcimaDe(
                contexto.auxiliares[2],
                deadlocksAntes,
              );
              // Delta exato: o contador é global ao banco; o banco precisa
              // estar exclusivo da suíte. O incremento sozinho não identifica
              // a transação responsável.
              expect(deadlocksDepois - deadlocksAntes).toBe(1);
            } finally {
              liberar();
              await Promise.allSettled([transacaoA, transacaoB]);
            }
          },
          { clientesAuxiliares: 3 },
        );
      }, 180_000);

      it('conflito serializável entre transações cruas: SQLSTATE 40001 em meta.code quando exposto, ou código Prisma P2034', async () => {
        await comContextoReset(
          url,
          async (contexto) => {
            const deadlocksAntes = await lerDeadlocks(contexto.auxiliares[2]);
            const leu = criarSinal();
            let liberar!: () => void;
            const liberado = new Promise<void>((resolver) => {
              liberar = resolver;
            });

            const transacao = capturarResultado(
              contexto.auxiliares[0].$transaction(
                async (tx) => {
                  await tx.$queryRaw`SELECT "versaoAutorizacao" FROM "Usuario" WHERE "id" = ${contexto.alvo.id}`;
                  leu.resolver();
                  await liberado;
                  await tx.$executeRaw`UPDATE "Usuario" SET "versaoAutorizacao" = "versaoAutorizacao" + 1 WHERE "id" = ${contexto.alvo.id}`;
                },
                {
                  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                },
              ),
            );

            try {
              await comLimite(
                leu.promessa,
                10_000,
                'A transação crua não leu o registro.',
              );

              await contexto.auxiliares[1].usuario.update({
                where: { id: contexto.alvo.id },
                data: { versaoAutorizacao: { increment: 1 } },
              });
              liberar();

              const resultado = exigirErro(await transacao);
              // SQLSTATE observado diretamente em meta.code (quando exposto);
              // nunca inferido a partir do código Prisma.
              const sqlstate = sqlStateDoErro(resultado.erro);
              const codigo = codigoDoErro(resultado.erro);

              expect(sqlstate === null || sqlstate === '40001').toBe(true);
              if (sqlstate === null) {
                // Ausência preservada: aceita-se somente o P2034 observado,
                // sem equivalência universal entre P2034 e SQLSTATE.
                expect(codigo).toBe('P2034');
              }
              expect(clientVersionDoErro(resultado.erro)).not.toBe(
                'integration-test',
              );
              expect(await lerDeadlocks(contexto.auxiliares[2])).toBe(
                deadlocksAntes,
              );
            } finally {
              liberar();
              await Promise.allSettled([transacao]);
            }
          },
          { clientesAuxiliares: 3 },
        );
      });
    });

    describe('serialização e retry (serviço com PostgreSQL real)', () => {
      it('40001 real: retry e RESET_CONCORRENTE após reler a versão atualizada', async () => {
        await comContextoReset(url, async (contexto) => {
          await criarTokenRecuperacao(
            contexto.prisma,
            contexto.alvo.id,
            'ativo',
          );
          const observador = criarObservadorErros();
          const contador = criarContadorTentativas();
          const deadlocksAntes = await lerDeadlocks(contexto.auxiliares[1]);

          let liberarBloqueador!: () => void;
          const liberado = new Promise<void>((resolver) => {
            liberarBloqueador = resolver;
          });
          const travado = criarSinal();

          const bloqueador = contexto.auxiliares[0].$transaction(async (tx) => {
            await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = ${contexto.ator.id} FOR UPDATE`;
            travado.resolver();
            await liberado;
          });

          const iniciouReset = criarSinal();
          let execucao: Promise<ResultadoExecucao<ResultadoReset>> | undefined;
          try {
            await comLimite(
              travado.promessa,
              10_000,
              'O bloqueador não adquiriu o lock do ator.',
            );

            execucao = capturarResultado(
              criarServicoResetComGanchos(
                contexto.prisma,
                ganchosDeContagem(contador, observador, {
                  aoIniciarQueryRaw: (indice) => {
                    if (indice === 1) iniciouReset.resolver();
                  },
                }),
              ).resetarSenhaAdministrativaManual(
                contexto.alvo.id,
                atorDe(contexto.ator),
                0,
                IP,
              ),
            );

            await comLimite(
              iniciouReset.promessa,
              10_000,
              'O reset não iniciou o lock do ator.',
            );

            await contexto.auxiliares[1].usuario.update({
              where: { id: contexto.alvo.id },
              data: { versaoAutorizacao: { increment: 1 } },
            });
            liberarBloqueador();
            await bloqueador;

            const resultado = exigirErro(await execucao);
            expect(resultado.erro).toBeInstanceOf(ConflictException);
            expect(respostaDe(resultado.erro)).toMatchObject({
              error: 'RESET_CONCORRENTE',
            });

            // Retry comprovado: duas transações realmente iniciadas.
            expect(contador.total()).toBe(2);

            // Código efetivamente recebido na primeira tentativa. P2034 é
            // aceito apenas como representação Prisma de conflito; o teste de
            // transações cruas é consistente com essa representação nesta
            // versão, sem estabelecer equivalência universal entre P2034 e
            // SQLSTATE.
            const errosPrisma = observador
              .erros()
              .filter((registro) => registro.codigo !== null);
            expect(errosPrisma).toHaveLength(1);
            expect(
              errosPrisma[0].sqlstate === '40001' ||
                errosPrisma[0].codigo === 'P2034',
            ).toBe(true);

            // Nenhum erro real pode ter origem na injeção artificial.
            expect(
              observador
                .erros()
                .every(
                  (registro) => registro.clientVersion !== 'integration-test',
                ),
            ).toBe(true);

            // Sem deadlock: a falha observada é de serialização.
            expect(await lerDeadlocks(contexto.auxiliares[1])).toBe(
              deadlocksAntes,
            );

            const alvo = await lerUsuario(contexto.prisma, contexto.alvo.id);
            expect(alvo).toMatchObject({
              senha: contexto.senhaOriginalHash,
              versaoAutorizacao: 1,
              trocaSenhaObrigatoria: false,
            });
            expect(
              await contarAuditoriasReset(contexto, contexto.alvo.id),
            ).toBe(0);
            // O token ativo existente não foi removido pela tentativa abortada.
            expect(
              await contexto.prisma.passwordResetToken.count({
                where: { userId: contexto.alvo.id },
              }),
            ).toBe(1);
          } finally {
            liberarBloqueador();
            await Promise.allSettled([bloqueador, execucao]);
          }
        });
      }, 180_000);
    });

    describe('esgotamento de retry (injeção controlada de P2034)', () => {
      it('503 após três transações reais com rollback, sem RESET_CONCORRENTE', async () => {
        await comContextoReset(url, async (contexto) => {
          await criarTokenRecuperacao(
            contexto.prisma,
            contexto.alvo.id,
            'ativo',
          );
          const contador = criarContadorTentativas();
          const observador = criarObservadorErros();
          const deadlocksAntes = await lerDeadlocks(contexto.auxiliares[0]);

          const erro = await capturarErro(
            criarServicoResetComP2034NaAuditoria(
              contexto.prisma,
              contador,
              observador,
            ).resetarSenhaAdministrativaManual(
              contexto.alvo.id,
              atorDe(contexto.ator),
              0,
              IP,
            ),
          );

          expect(erro).toBeInstanceOf(ServiceUnavailableException);
          expect((erro as ServiceUnavailableException).getStatus()).toBe(503);
          expect(respostaDe(erro)).not.toHaveProperty(
            'error',
            'RESET_CONCORRENTE',
          );

          // Três transações realmente iniciadas (BEGIN confirmado por SELECT 1).
          expect(contador.total()).toBe(3);

          // A injeção é identificável: os três erros vêm do client de teste e
          // não de falhas espontâneas 40001/40P01 do PostgreSQL. O P2034 e o
          // meta.code deste cenário são artificiais; nenhum SQLSTATE real foi
          // emitido pelo PostgreSQL.
          expect(observador.erros()).toHaveLength(3);
          expect(observador.codigos()).toEqual(['P2034', 'P2034', 'P2034']);
          expect(
            observador
              .erros()
              .every(
                (registro) => registro.clientVersion === 'integration-test',
              ),
          ).toBe(true);
          expect(await lerDeadlocks(contexto.auxiliares[0])).toBe(
            deadlocksAntes,
          );

          const alvo = await lerUsuario(contexto.prisma, contexto.alvo.id);
          expect(alvo).toMatchObject({
            senha: contexto.senhaOriginalHash,
            versaoAutorizacao: 0,
            trocaSenhaObrigatoria: false,
          });
          expect(
            await contexto.prisma.passwordResetToken.count({
              where: { userId: contexto.alvo.id },
            }),
          ).toBe(1);
          expect(await contarAuditoriasReset(contexto, contexto.alvo.id)).toBe(
            0,
          );
        });
      });
    });

    it('configuração estática: a constante do banco de integração é sistema_gestao_integracao', () => {
      // Não confirma a identidade do PostgreSQL. A identidade real é verificada
      // por validarClienteIntegracao (consulta SQL) em cada contexto.
      expect(BANCO_INTEGRACAO).toBe('sistema_gestao_integracao');
    });
  },
);
