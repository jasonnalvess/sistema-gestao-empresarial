import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/services/mail.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { prepararJsonAuditoria } from '../auditoria/auditoria-sanitizer';
import {
  DIAS_TRIAL_PADRAO,
  calcularPeriodoComercial,
  comoIsoUtc,
} from '../common/validacao-comercial/situacao-comercial';
import { ConcluirCadastroDto } from './dto/concluir-cadastro.dto';
import { CriarSolicitacaoCadastroDto } from './dto/criar-solicitacao-cadastro.dto';

/** Validade do token de verificação de cadastro (V3.6.5): 24 horas. */
export const VALIDADE_TOKEN_CADASTRO_MS = 24 * 60 * 60 * 1000;

/** Rate limit aprovado: 5 solicitações por 15 minutos (janela do RateLimitService). */
export const LIMITE_SOLICITACOES_CADASTRO = 5;
export const JANELA_RATE_LIMIT_CADASTRO_MINUTOS = 15;

/**
 * Chave única de rate limit da Fase A. Solicitação e reenvio compartilham a
 * mesma quota (5 operações por IP a cada 15 minutos), conforme requisito
 * aprovado da V3.6.5. Não usar chaves por rota: isso dobraria a quota.
 */
export const ENDPOINT_RATE_LIMIT_CADASTRO = 'cadastro-publico/cadastro';

/**
 * Chave própria da conclusão (Fase B). Não compartilha a quota de
 * solicitação/reenvio: são operações de naturezas distintas e um usuário que
 * esgotou os reenvios ainda precisa concluir o cadastro. Limite mantido em 5
 * operações por IP a cada 15 minutos.
 */
export const ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO =
  'cadastro-publico/conclusao';
export const LIMITE_CONCLUSAO_CADASTRO = 5;

/**
 * Módulos padrão do onboarding (V3.6.5). Lista fechada: o CRM nunca é
 * associado automaticamente e nenhum outro módulo é incluído.
 */
export const MODULOS_PADRAO_ONBOARDING = [
  'estoque',
  'agenda',
  'ordens_servico',
  'vendas',
  'funcionarios',
  'caixa',
  'fiscal',
] as const;

/** Perfil padrão replicado para cada empresa criada no onboarding. */
export const CHAVE_PERFIL_ADMINISTRADOR_EMPRESA = 'administrador_empresa';
export const NOME_PERFIL_ADMINISTRADOR_EMPRESA = 'Administrador da Empresa';
export const DESCRICAO_PERFIL_ADMINISTRADOR_EMPRESA =
  'Perfil responsável pela administração dos recursos da própria empresa';

/** Custo do bcrypt igual ao fluxo em que o próprio usuário define a senha. */
export const CUSTO_BCRYPT_CONCLUSAO_CADASTRO = 12;

/** Tentativas em caso de conflito de serialização (P2034/40001/40P01). */
export const TENTATIVAS_CONCLUSAO_CADASTRO = 3;

export const MENSAGEM_TOKEN_CADASTRO_INVALIDO =
  'Token de verificação inválido ou expirado.';

export const MENSAGEM_CONCLUSAO_CADASTRO =
  'Cadastro concluído com sucesso. Acesse com o e-mail e a senha definidos.';

export const MENSAGEM_CONFLITO_CONCORRENTE =
  'Alteração concorrente. Tente novamente.';

/** Tentativas de persistência em caso de colisão (improvável) do hash do token. */
export const TENTATIVAS_CRIACAO_TOKEN = 3;

export const TAMANHO_MAXIMO_ERRO_ENVIO = 200;

/**
 * Resposta pública única, idêntica para qualquer entrada. Não revela se o
 * e-mail já possui conta, se a solicitação foi criada ou se o envio falhou
 * (anti-enumeração).
 */
export const MENSAGEM_RESPOSTA_CADASTRO_PUBLICO =
  'Se os dados informados puderem ser utilizados, enviaremos as instruções de verificação para o e-mail informado.';

export interface TokenVerificacao {
  tokenBruto: string;
  tokenHash: string;
}

export interface SolicitacaoPersistida {
  id: string;
  email: string;
  nomeEmpresa: string;
  nomeResponsavel: string;
  expiresAt: Date;
}

export interface SolicitacaoValidada {
  id: string;
  email: string;
  nomeEmpresa: string;
  nomeResponsavel: string;
  expiresAt: Date;
}

export interface ResultadoConclusaoCadastro {
  message: string;
  empresaId: string;
  usuarioId: string;
}

/** Gera token criptograficamente seguro e seu hash SHA-256 (nunca persistir o bruto). */
export function gerarTokenVerificacao(): TokenVerificacao {
  const tokenBruto = randomBytes(32).toString('hex');
  const tokenHash = hashTokenVerificacao(tokenBruto);
  return { tokenBruto, tokenHash };
}

export function hashTokenVerificacao(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sanitiza o erro de envio antes de persistir/logar: guarda apenas o código
 * (ou o nome do erro), nunca a mensagem — que pode conter endereço de e-mail,
 * token ou resposta do servidor SMTP.
 */
export function sanitizarErroEnvio(erro: unknown): string {
  if (typeof erro === 'object' && erro !== null) {
    const codigo = (erro as { code?: unknown }).code;
    if (typeof codigo === 'string' && codigo.trim().length > 0) {
      return codigo.trim().slice(0, TAMANHO_MAXIMO_ERRO_ENVIO);
    }

    const nome = (erro as { name?: unknown }).name;
    if (typeof nome === 'string' && nome.trim().length > 0) {
      return nome.trim().slice(0, TAMANHO_MAXIMO_ERRO_ENVIO);
    }
  }

  return 'ERRO_ENVIO_EMAIL';
}

@Injectable()
export class CadastroPublicoService {
  private readonly logger = new Logger(CadastroPublicoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Fase A — registra a solicitação pendente e dispara o e-mail de verificação.
   * Nenhuma empresa, usuário ou senha é criado. O SMTP é executado fora de
   * transação e sua falha NÃO elimina nem invalida a pendência.
   */
  async solicitar(
    dados: CriarSolicitacaoCadastroDto,
    ip?: string,
  ): Promise<{ message: string }> {
    const email = normalizarEmail(dados.email);

    const { solicitacao, tokenBruto } = await this.criarComTokenUnico({
      nomeEmpresa: dados.nomeEmpresa.trim(),
      cnpjEmpresa: dados.cnpjEmpresa?.trim() || null,
      nomeResponsavel: dados.nomeResponsavel.trim(),
      email,
    });

    await this.auditar(
      'SOLICITACAO_CADASTRO_PUBLICA',
      solicitacao.id,
      {
        email: solicitacao.email,
        estado: 'PENDENTE',
        expiraEm: solicitacao.expiresAt,
        tentativasEnvio: 0,
      },
      ip,
    );

    await this.enviarVerificacao(solicitacao, tokenBruto);

    return { message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO };
  }

  /**
   * Reenvio — emite novo token para a solicitação pendente mais recente do
   * e-mail, invalidando o token anterior por substituição do hash. A
   * atualização é condicional (estado PENDENTE e não consumida) e atômica,
   * protegendo contra reenvios concorrentes. Sem pendência, a resposta
   * permanece genérica e nenhum efeito colateral ocorre.
   */
  async reenviar(email: string, ip?: string): Promise<{ message: string }> {
    const emailNormalizado = normalizarEmail(email);

    const pendente = await this.prisma.solicitacaoCadastro.findFirst({
      where: { email: emailNormalizado, estado: 'PENDENTE', usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendente) {
      return { message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO };
    }

    const { tokenBruto, tokenHash } = gerarTokenVerificacao();
    const expiraEm = new Date(Date.now() + VALIDADE_TOKEN_CADASTRO_MS);

    const atualizacao = await this.prisma.solicitacaoCadastro.updateMany({
      where: { id: pendente.id, estado: 'PENDENTE', usedAt: null },
      data: { tokenHash, expiresAt: expiraEm },
    });

    // Condição perdida (consumida/cancelada por outra requisição concorrente):
    // não envia e-mail e mantém a resposta genérica.
    if (atualizacao.count !== 1) {
      return { message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO };
    }

    await this.auditar(
      'REENVIO_SOLICITACAO_CADASTRO',
      pendente.id,
      {
        email: pendente.email,
        estado: 'PENDENTE',
        expiraEm,
      },
      ip,
    );

    await this.enviarVerificacao(
      {
        id: pendente.id,
        email: pendente.email,
        nomeEmpresa: pendente.nomeEmpresa,
        nomeResponsavel: pendente.nomeResponsavel,
        expiresAt: expiraEm,
      },
      tokenBruto,
    );

    return { message: MENSAGEM_RESPOSTA_CADASTRO_PUBLICO };
  }

  /**
   * Fase B — conclusão do cadastro após a verificação do e-mail.
   *
   * Pré-valida o token sem consumi-lo (falha rápida antes do bcrypt) e depois
   * executa TUDO em uma única transação Serializable: bloqueio da solicitação,
   * reconfirmação do token, empresa, usuário ADMIN_EMPRESA com e-mail
   * verificado, perfil padrão (com permissões), sete módulos, trial de 30 dias,
   * auditoria com ator sistema (`usuarioId = null`) e consumo do token.
   *
   * Qualquer falha reverte a transação por inteiro e o token continua válido.
   */
  async concluir(
    dados: ConcluirCadastroDto,
    ip?: string,
  ): Promise<ResultadoConclusaoCadastro> {
    const token = typeof dados.token === 'string' ? dados.token.trim() : '';

    if (dados.senha !== dados.confirmarSenha) {
      throw new BadRequestException('As senhas não conferem.');
    }

    // Pré-validação sem consumo. A autoridade final continua sendo a checagem
    // condicional dentro da transação.
    const solicitacao = await this.validarToken(token);
    if (!solicitacao) {
      throw new BadRequestException(MENSAGEM_TOKEN_CADASTRO_INVALIDO);
    }

    const tokenHash = hashTokenVerificacao(token);
    const senhaHash = await bcrypt.hash(
      dados.senha,
      CUSTO_BCRYPT_CONCLUSAO_CADASTRO,
    );

    for (
      let tentativa = 0;
      tentativa < TENTATIVAS_CONCLUSAO_CADASTRO;
      tentativa++
    ) {
      try {
        return await this.prisma.$transaction(
          async (tx) => this.executarConclusao(tx, tokenHash, senhaHash, ip),
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 15000,
            maxWait: 5000,
          },
        );
      } catch (erro) {
        if (this.ehConflitoSerializacao(erro)) {
          if (tentativa < TENTATIVAS_CONCLUSAO_CADASTRO - 1) continue;
          throw new ConflictException(MENSAGEM_CONFLITO_CONCORRENTE);
        }

        this.traduzirConflitoCadastro(erro);
        throw erro;
      }
    }

    throw new ConflictException(MENSAGEM_CONFLITO_CONCORRENTE);
  }

  private async executarConclusao(
    tx: Prisma.TransactionClient,
    tokenHash: string,
    senhaHash: string,
    ip?: string,
  ): Promise<ResultadoConclusaoCadastro> {
    // Bloqueio pessimista pela chave do token: duas conclusões concorrentes do
    // mesmo token são serializadas já na entrada da transação.
    await tx.$queryRaw`SELECT "id" FROM "SolicitacaoCadastro" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;

    const solicitacao = await tx.solicitacaoCadastro.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        nomeEmpresa: true,
        cnpjEmpresa: true,
        nomeResponsavel: true,
        email: true,
        tokenHash: true,
        expiresAt: true,
        usedAt: true,
        estado: true,
      },
    });

    if (
      !solicitacao ||
      solicitacao.tokenHash !== tokenHash ||
      solicitacao.estado !== 'PENDENTE' ||
      solicitacao.usedAt !== null ||
      solicitacao.expiresAt.getTime() <= Date.now()
    ) {
      // Nenhuma escrita ocorreu: rollback puro, token preservado.
      throw new BadRequestException(MENSAGEM_TOKEN_CADASTRO_INVALIDO);
    }

    // Trial de 30 dias contado do instante da conclusão. Se a transação falhar,
    // o período é descartado junto com as demais escritas.
    const periodo = calcularPeriodoComercial(new Date(), DIAS_TRIAL_PADRAO);

    const empresa = await tx.empresa.create({
      data: {
        nome: solicitacao.nomeEmpresa,
        cnpj: solicitacao.cnpjEmpresa ?? undefined,
        validadeComercialInicio: periodo.validadeComercialInicio,
        validadeComercialFim: periodo.validadeComercialFim,
      },
      select: { id: true, nome: true },
    });

    const usuario = await tx.usuario.create({
      data: {
        nome: solicitacao.nomeResponsavel,
        email: solicitacao.email,
        senha: senhaHash,
        tipo: 'ADMIN_EMPRESA',
        emailVerificado: true,
        empresaId: empresa.id,
      },
      select: { id: true, email: true },
    });

    const perfil = await this.criarPerfilAdministrador(tx, empresa.id);

    await tx.usuarioPerfil.create({
      data: { usuarioId: usuario.id, perfilId: perfil.id, ativo: true },
      select: { id: true },
    });

    const modulos = await this.associarModulosPadrao(tx, empresa.id);

    await tx.auditoriaLog.create({
      data: {
        acao: 'CONCLUSAO_CADASTRO_PUBLICO',
        entidade: 'Empresa',
        entidadeId: empresa.id,
        dadosNovos: prepararJsonAuditoria({
          ator: 'SISTEMA',
          solicitacaoId: solicitacao.id,
          empresa: { id: empresa.id, nome: empresa.nome },
          usuario: {
            id: usuario.id,
            email: usuario.email,
            tipo: 'ADMIN_EMPRESA',
            emailVerificado: true,
          },
          perfilChave: perfil.chave,
          modulos,
          validadeComercialInicio: comoIsoUtc(periodo.validadeComercialInicio),
          validadeComercialFim: comoIsoUtc(periodo.validadeComercialFim),
        }),
        empresaId: empresa.id,
        // Ator é o sistema: operação pública, sem usuário autenticado.
        usuarioId: null,
        ip,
      },
    });

    // Consumo do token dentro da mesma transação. A condição garante uso único
    // mesmo que outra transação tenha consumido a solicitação.
    const consumo = await tx.solicitacaoCadastro.updateMany({
      where: {
        id: solicitacao.id,
        tokenHash,
        estado: 'PENDENTE',
        usedAt: null,
      },
      data: { estado: 'CONCLUIDA', usedAt: new Date() },
    });

    if (consumo.count !== 1) {
      throw new ConflictException(MENSAGEM_CONFLITO_CONCORRENTE);
    }

    return {
      message: MENSAGEM_CONCLUSAO_CADASTRO,
      empresaId: empresa.id,
      usuarioId: usuario.id,
    };
  }

  /**
   * Cria o perfil padrão da empresa replicando as permissões do perfil
   * canônico do seed (`administrador_empresa`, `sistema = true`). Perfis de
   * sistema são protegidos contra edição (`perfilParaEscrita`), portanto a
   * fonte de permissões é estável. Falha de forma fechada se o modelo não
   * existir ou estiver sem permissões: melhor reverter do que entregar uma
   * conta de administrador sem acesso.
   */
  private async criarPerfilAdministrador(
    tx: Prisma.TransactionClient,
    empresaId: string,
  ): Promise<{ id: string; chave: string }> {
    const modelo = await tx.perfil.findFirst({
      where: {
        chave: CHAVE_PERFIL_ADMINISTRADOR_EMPRESA,
        escopo: 'EMPRESA',
        sistema: true,
        ativo: true,
        empresaId: { not: null },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        permissoes: { select: { permissaoId: true, permitido: true } },
      },
    });

    if (!modelo || modelo.permissoes.length === 0) {
      throw new InternalServerErrorException(
        'Configuração do perfil padrão indisponível.',
      );
    }

    return tx.perfil.create({
      data: {
        nome: NOME_PERFIL_ADMINISTRADOR_EMPRESA,
        chave: CHAVE_PERFIL_ADMINISTRADOR_EMPRESA,
        descricao: DESCRICAO_PERFIL_ADMINISTRADOR_EMPRESA,
        sistema: true,
        escopo: 'EMPRESA',
        ativo: true,
        empresaId,
        permissoes: {
          create: modelo.permissoes.map(({ permissaoId, permitido }) => ({
            permissaoId,
            permitido,
          })),
        },
      },
      select: { id: true, chave: true },
    });
  }

  /**
   * Associa exatamente os sete módulos padrão. Falha de forma fechada quando
   * a configuração de módulos está incompleta (nenhuma associação parcial).
   */
  private async associarModulosPadrao(
    tx: Prisma.TransactionClient,
    empresaId: string,
  ): Promise<string[]> {
    const modulos = await tx.moduloSistema.findMany({
      where: {
        chave: { in: [...MODULOS_PADRAO_ONBOARDING] },
        ativo: true,
      },
      select: { id: true, chave: true },
    });

    if (modulos.length !== MODULOS_PADRAO_ONBOARDING.length) {
      throw new InternalServerErrorException(
        'Configuração de módulos padrão indisponível.',
      );
    }

    const criados = await tx.empresaModulo.createMany({
      data: modulos.map((modulo) => ({
        empresaId,
        moduloId: modulo.id,
        ativo: true,
      })),
    });

    if (criados.count !== MODULOS_PADRAO_ONBOARDING.length) {
      throw new InternalServerErrorException(
        'Falha ao associar os módulos padrão.',
      );
    }

    return modulos.map((modulo) => modulo.chave).sort();
  }

  private ehConflitoSerializacao(erro: unknown): boolean {
    return (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      (erro.code === 'P2034' ||
        (erro.code === 'P2010' &&
          ['40001', '40P01'].includes(String(erro.meta?.code))))
    );
  }

  /** Converte violações de unicidade em respostas controladas (409). */
  private traduzirConflitoCadastro(erro: unknown): void {
    if (
      !(erro instanceof Prisma.PrismaClientKnownRequestError) ||
      erro.code !== 'P2002'
    ) {
      return;
    }

    const alvo = erro.meta?.target;
    const campos = Array.isArray(alvo)
      ? alvo.join(',')
      : typeof alvo === 'string'
        ? alvo
        : '';

    if (campos.includes('cnpj')) {
      throw new ConflictException('CNPJ já cadastrado para outra empresa');
    }

    if (campos.includes('email')) {
      throw new ConflictException('E-mail já cadastrado');
    }
  }

  /**
   * Leitura de validação (sem consumo; consumo pertence à Fase B/E3).
   * Retorna null para token inexistente, expirado, já utilizado ou de
   * solicitação que não esteja PENDENTE.
   */
  async validarToken(token: string): Promise<SolicitacaoValidada | null> {
    const tokenLimpo = typeof token === 'string' ? token.trim() : '';
    if (!tokenLimpo) return null;

    const solicitacao = await this.prisma.solicitacaoCadastro.findUnique({
      where: { tokenHash: hashTokenVerificacao(tokenLimpo) },
    });

    if (!solicitacao) return null;
    if (solicitacao.estado !== 'PENDENTE' || solicitacao.usedAt) return null;
    if (solicitacao.expiresAt.getTime() <= Date.now()) return null;

    return {
      id: solicitacao.id,
      email: solicitacao.email,
      nomeEmpresa: solicitacao.nomeEmpresa,
      nomeResponsavel: solicitacao.nomeResponsavel,
      expiresAt: solicitacao.expiresAt,
    };
  }

  /** Persiste a pendência com token novo; regenera em colisão de hash (P2002). */
  private async criarComTokenUnico(dados: {
    nomeEmpresa: string;
    cnpjEmpresa: string | null;
    nomeResponsavel: string;
    email: string;
  }): Promise<{ solicitacao: SolicitacaoPersistida; tokenBruto: string }> {
    for (
      let tentativa = 1;
      tentativa <= TENTATIVAS_CRIACAO_TOKEN;
      tentativa += 1
    ) {
      const { tokenBruto, tokenHash } = gerarTokenVerificacao();
      const expiresAt = new Date(Date.now() + VALIDADE_TOKEN_CADASTRO_MS);

      try {
        const solicitacao = await this.prisma.solicitacaoCadastro.create({
          data: {
            nomeEmpresa: dados.nomeEmpresa,
            cnpjEmpresa: dados.cnpjEmpresa,
            nomeResponsavel: dados.nomeResponsavel,
            email: dados.email,
            tokenHash,
            expiresAt,
            estado: 'PENDENTE',
          },
        });

        return { solicitacao, tokenBruto };
      } catch (erro) {
        if (
          !this.ehColisaoTokenHash(erro) ||
          tentativa === TENTATIVAS_CRIACAO_TOKEN
        ) {
          throw erro;
        }
      }
    }

    throw new InternalServerErrorException(
      'Não foi possível registrar a solicitação de cadastro.',
    );
  }

  private ehColisaoTokenHash(erro: unknown): boolean {
    return (
      erro instanceof Prisma.PrismaClientKnownRequestError &&
      erro.code === 'P2002'
    );
  }

  /**
   * Envio fora de transação. Em falha SMTP: registra tentativa e erro
   * sanitizado e PRESERVA a pendência (não exclui, não invalida o token).
   * Diferença intencional em relação ao fluxo de recuperação de senha, que
   * cancela a pendência em falha de envio (requisito aprovado da V3.6.5).
   */
  private async enviarVerificacao(
    solicitacao: SolicitacaoPersistida,
    tokenBruto: string,
  ): Promise<void> {
    try {
      await this.mailService.enviarEmailVerificacaoCadastro({
        destinatario: solicitacao.email,
        nomeResponsavel: solicitacao.nomeResponsavel,
        nomeEmpresa: solicitacao.nomeEmpresa,
        token: tokenBruto,
      });

      await this.registrarTentativaEnvio(solicitacao.id, null);
    } catch (erro) {
      const erroSanitizado = sanitizarErroEnvio(erro);
      this.logger.error(
        `Falha ao enviar e-mail de verificação de cadastro. codigo=${erroSanitizado}`,
      );

      await this.registrarTentativaEnvio(solicitacao.id, erroSanitizado).catch(
        (erroRegistro) => {
          this.logger.error(
            `Falha ao registrar tentativa de envio do cadastro. codigo=${sanitizarErroEnvio(erroRegistro)}`,
          );
        },
      );
    }
  }

  private async registrarTentativaEnvio(
    id: string,
    erroSanitizado: string | null,
  ): Promise<void> {
    await this.prisma.solicitacaoCadastro.update({
      where: { id },
      data: {
        tentativasEnvio: { increment: 1 },
        ultimoEnvioEm: new Date(),
        ultimoErroEnvio: erroSanitizado,
      },
    });
  }

  /**
   * Auditoria best-effort (padrão do recovery): fora da operação principal e
   * sem segredos. usuarioId é omitido de propósito — operação executada pelo
   * sistema deve ficar com usuarioId = NULL na auditoria.
   */
  private async auditar(
    acao: string,
    entidadeId: string,
    dadosNovos: Record<string, unknown>,
    ip?: string,
  ): Promise<void> {
    try {
      await this.auditoriaService.registrar({
        acao,
        entidade: 'SolicitacaoCadastro',
        entidadeId,
        dadosNovos: prepararJsonAuditoria(dadosNovos),
        ip,
      });
    } catch (erro) {
      this.logger.error(
        `Falha ao registrar auditoria ${acao}. codigo=${sanitizarErroEnvio(erro)}`,
      );
    }
  }
}
