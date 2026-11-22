import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailService } from '../common/services/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CadastroPublicoService,
  CHAVE_PERFIL_ADMINISTRADOR_EMPRESA,
  CUSTO_BCRYPT_CONCLUSAO_CADASTRO,
  ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO,
  LIMITE_CONCLUSAO_CADASTRO,
  MENSAGEM_CONCLUSAO_CADASTRO,
  MENSAGEM_TOKEN_CADASTRO_INVALIDO,
  MODULOS_PADRAO_ONBOARDING,
  hashTokenVerificacao,
} from './cadastro-publico.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(() => Promise.resolve('hash-fake:12')),
}));

const bcryptMock = bcrypt as unknown as { hash: jest.Mock };

const TOKEN = 'a'.repeat(64);
const TOKEN_HASH = hashTokenVerificacao(TOKEN);
const UMA_HORA_MS = 60 * 60 * 1000;
const UM_DIA_MS = 24 * UMA_HORA_MS;

const SENHA = 'SenhaForte123';

const MODULOS_DISPONIVEIS = [...MODULOS_PADRAO_ONBOARDING, 'crm'];

interface LinhaSolicitacao {
  id: string;
  nomeEmpresa: string;
  cnpjEmpresa: string | null;
  nomeResponsavel: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  estado: 'PENDENTE' | 'CONCLUIDA';
}

interface LinhaEmpresa {
  id: string;
  nome: string;
  cnpj: string | null;
  validadeComercialInicio: Date | null;
  validadeComercialFim: Date | null;
}

interface LinhaUsuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  emailVerificado: boolean;
  empresaId: string | null;
}

interface LinhaPerfil {
  id: string;
  nome: string;
  chave: string;
  descricao?: string;
  sistema: boolean;
  escopo: string;
  ativo: boolean;
  empresaId: string | null;
}

interface EntradaPermissao {
  permissaoId: string;
  permitido: boolean;
}

interface LinhaPerfilPermissao extends EntradaPermissao {
  perfilId: string;
}

interface LinhaUsuarioPerfil {
  usuarioId: string;
  perfilId: string;
  ativo: boolean;
}

interface LinhaEmpresaModulo {
  empresaId: string;
  moduloId: string;
  ativo: boolean;
}

interface LinhaAuditoria {
  acao: string;
  entidade: string;
  entidadeId?: string;
  dadosNovos?: unknown;
  empresaId?: string;
  usuarioId?: string | null;
  ip?: string;
}

interface EstadoFake {
  solicitacoes: LinhaSolicitacao[];
  empresas: LinhaEmpresa[];
  usuarios: LinhaUsuario[];
  perfis: LinhaPerfil[];
  perfilPermissoes: LinhaPerfilPermissao[];
  usuarioPerfis: LinhaUsuarioPerfil[];
  empresaModulos: LinhaEmpresaModulo[];
  auditoria: LinhaAuditoria[];
}

type OperacaoFalha =
  | 'empresa'
  | 'usuario'
  | 'perfil'
  | 'modulos'
  | 'auditoria'
  | 'validade';

interface ConfiguracaoAmbiente {
  solicitacao?: Partial<LinhaSolicitacao>;
  modeloPerfil?: { id: string; permissoes: EntradaPermissao[] } | null;
  modulosDisponiveis?: string[];
  falhas?: Partial<Record<OperacaoFalha, Error>>;
  expirarNaTransacao?: boolean;
  empresasExistentes?: LinhaEmpresa[];
  usuariosExistentes?: LinhaUsuario[];
}

function criarP2002(target: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
    meta: { target },
  });
}

function criarP2034(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Transaction failed due to a write conflict',
    { code: 'P2034', clientVersion: '6.19.3' },
  );
}

function criarP2010(codigo: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Raw query failed', {
    code: 'P2010',
    clientVersion: '6.19.3',
    meta: { code: codigo },
  });
}

function clonarEstado(origem: EstadoFake): EstadoFake {
  return {
    solicitacoes: origem.solicitacoes.map((item) => ({ ...item })),
    empresas: origem.empresas.map((item) => ({ ...item })),
    usuarios: origem.usuarios.map((item) => ({ ...item })),
    perfis: origem.perfis.map((item) => ({ ...item })),
    perfilPermissoes: origem.perfilPermissoes.map((item) => ({ ...item })),
    usuarioPerfis: origem.usuarioPerfis.map((item) => ({ ...item })),
    empresaModulos: origem.empresaModulos.map((item) => ({ ...item })),
    auditoria: origem.auditoria.map((item) => ({ ...item })),
  };
}

function criarAmbiente(config: ConfiguracaoAmbiente = {}) {
  const estado: EstadoFake = {
    solicitacoes: [
      {
        id: 'sol-1',
        nomeEmpresa: 'Empresa Teste',
        cnpjEmpresa: '12345678000190',
        nomeResponsavel: 'Fulano de Tal',
        email: 'fulano@exemplo.com',
        tokenHash: TOKEN_HASH,
        expiresAt: new Date(Date.now() + UMA_HORA_MS),
        usedAt: null,
        estado: 'PENDENTE',
        ...config.solicitacao,
      },
    ],
    empresas: [...(config.empresasExistentes ?? [])],
    usuarios: [...(config.usuariosExistentes ?? [])],
    perfis: [],
    perfilPermissoes: [],
    usuarioPerfis: [],
    empresaModulos: [],
    auditoria: [],
  };

  const modeloPerfil =
    config.modeloPerfil === undefined
      ? {
          id: 'perfil-modelo',
          permissoes: [
            { permissaoId: 'permissao-1', permitido: true },
            { permissaoId: 'permissao-2', permitido: true },
          ],
        }
      : config.modeloPerfil;

  const modulosDisponiveis = config.modulosDisponiveis ?? MODULOS_DISPONIVEIS;

  let sequencia = 0;
  const proximoId = (prefixo: string) => `${prefixo}-${(sequencia += 1)}`;

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'sol-1' }]),

    solicitacaoCadastro: {
      findUnique: jest.fn((args: { where: { tokenHash: string } }) => {
        const encontrada = estado.solicitacoes.find(
          (linha) => linha.tokenHash === args.where.tokenHash,
        );
        if (!encontrada) return Promise.resolve(null);

        // Simula o token expirando entre a pré-validação e a transação.
        if (config.expirarNaTransacao) {
          return Promise.resolve({
            ...encontrada,
            expiresAt: new Date(Date.now() - 1),
          });
        }

        return Promise.resolve({ ...encontrada });
      }),

      updateMany: jest.fn(
        (args: {
          where: {
            id: string;
            tokenHash: string;
            estado: 'PENDENTE';
            usedAt: null;
          };
          data: { estado: 'CONCLUIDA'; usedAt: Date };
        }) => {
          const linha = estado.solicitacoes.find(
            (item) => item.id === args.where.id,
          );

          if (
            !linha ||
            linha.tokenHash !== args.where.tokenHash ||
            linha.estado !== 'PENDENTE' ||
            linha.usedAt !== null
          ) {
            return Promise.resolve({ count: 0 });
          }

          linha.estado = args.data.estado;
          linha.usedAt = args.data.usedAt;
          return Promise.resolve({ count: 1 });
        },
      ),
    },

    empresa: {
      create: jest.fn(
        (args: {
          data: {
            nome: string;
            cnpj?: string;
            validadeComercialInicio?: Date;
            validadeComercialFim?: Date;
          };
        }) => {
          if (config.falhas?.validade) {
            return Promise.reject(config.falhas.validade);
          }
          if (config.falhas?.empresa) {
            return Promise.reject(config.falhas.empresa);
          }

          const cnpj = args.data.cnpj ?? null;
          if (cnpj && estado.empresas.some((item) => item.cnpj === cnpj)) {
            return Promise.reject(criarP2002(['cnpj']));
          }

          const empresa: LinhaEmpresa = {
            id: proximoId('empresa'),
            nome: args.data.nome,
            cnpj,
            validadeComercialInicio: args.data.validadeComercialInicio ?? null,
            validadeComercialFim: args.data.validadeComercialFim ?? null,
          };
          estado.empresas.push(empresa);
          return Promise.resolve({ id: empresa.id, nome: empresa.nome });
        },
      ),
    },

    usuario: {
      create: jest.fn(
        (args: {
          data: {
            nome: string;
            email: string;
            senha: string;
            tipo: string;
            emailVerificado: boolean;
            empresaId: string;
          };
        }) => {
          if (config.falhas?.usuario) {
            return Promise.reject(config.falhas.usuario);
          }

          if (estado.usuarios.some((item) => item.email === args.data.email)) {
            return Promise.reject(criarP2002(['email']));
          }

          const usuario: LinhaUsuario = {
            id: proximoId('usuario'),
            ...args.data,
          };
          estado.usuarios.push(usuario);
          return Promise.resolve({ id: usuario.id, email: usuario.email });
        },
      ),
    },

    perfil: {
      findFirst: jest.fn(() => Promise.resolve(modeloPerfil)),

      create: jest.fn(
        (args: {
          data: {
            nome: string;
            chave: string;
            descricao?: string;
            sistema: boolean;
            escopo: string;
            ativo: boolean;
            empresaId: string;
            permissoes: { create: EntradaPermissao[] };
          };
        }) => {
          if (config.falhas?.perfil) {
            return Promise.reject(config.falhas.perfil);
          }

          const { permissoes, ...resto } = args.data;
          const perfil: LinhaPerfil = { id: proximoId('perfil'), ...resto };
          estado.perfis.push(perfil);

          for (const item of permissoes.create) {
            estado.perfilPermissoes.push({
              perfilId: perfil.id,
              permissaoId: item.permissaoId,
              permitido: item.permitido,
            });
          }

          return Promise.resolve({ id: perfil.id, chave: perfil.chave });
        },
      ),
    },

    usuarioPerfil: {
      create: jest.fn((args: { data: LinhaUsuarioPerfil }) => {
        estado.usuarioPerfis.push({ ...args.data });
        return Promise.resolve({ id: proximoId('usuarioPerfil') });
      }),
    },

    moduloSistema: {
      findMany: jest.fn((args: { where: { chave: { in: string[] } } }) => {
        const chaves = args.where.chave.in;
        return Promise.resolve(
          chaves
            .filter((chave) => modulosDisponiveis.includes(chave))
            .map((chave) => ({ id: `modulo-${chave}`, chave })),
        );
      }),
    },

    empresaModulo: {
      createMany: jest.fn((args: { data: LinhaEmpresaModulo[] }) => {
        if (config.falhas?.modulos) {
          return Promise.reject(config.falhas.modulos);
        }

        estado.empresaModulos.push(...args.data.map((item) => ({ ...item })));
        return Promise.resolve({ count: args.data.length });
      }),
    },

    auditoriaLog: {
      create: jest.fn((args: { data: LinhaAuditoria }) => {
        if (config.falhas?.auditoria) {
          return Promise.reject(config.falhas.auditoria);
        }

        estado.auditoria.push({ ...args.data });
        return Promise.resolve({ id: proximoId('auditoria') });
      }),
    },
  };

  // Serializa as transações, como o row lock (`FOR UPDATE`) do PostgreSQL:
  // a segunda transação só enxerga o estado após o commit da primeira.
  let fila: Promise<unknown> = Promise.resolve();

  const prisma = {
    solicitacaoCadastro: {
      findUnique: jest.fn((args: { where: { tokenHash: string } }) => {
        const linha = estado.solicitacoes.find(
          (item) => item.tokenHash === args.where.tokenHash,
        );
        return Promise.resolve(linha ? { ...linha } : null);
      }),
    },

    $transaction: jest.fn(<T>(callback: (cliente: typeof tx) => Promise<T>) => {
      const execucao = fila.then(async () => {
        const instantaneo = clonarEstado(estado);

        try {
          return await callback(tx);
        } catch (erro) {
          // Rollback integral: nada do que a transação escreveu permanece.
          Object.assign(estado, clonarEstado(instantaneo));
          throw erro;
        }
      });

      fila = execucao.then(
        () => undefined,
        () => undefined,
      );

      return execucao;
    }),
  };

  const service = new CadastroPublicoService(
    prisma as unknown as PrismaService,
    {} as unknown as MailService,
    {} as unknown as AuditoriaService,
  );

  return { service, prisma, tx, estado };
}

const DADOS_CONCLUSAO = {
  token: TOKEN,
  senha: SENHA,
  confirmarSenha: SENHA,
};

describe('CadastroPublicoService — conclusão (Fase B)', () => {
  beforeEach(() => {
    bcryptMock.hash.mockClear();
  });

  describe('sucesso', () => {
    it('cria empresa, ADMIN_EMPRESA verificado, perfil, módulos, trial e auditoria', async () => {
      const { service, estado } = criarAmbiente();

      const resultado = await service.concluir(DADOS_CONCLUSAO, '203.0.113.10');

      expect(resultado.message).toBe(MENSAGEM_CONCLUSAO_CADASTRO);
      expect(resultado.empresaId).toBe(estado.empresas[0].id);
      expect(resultado.usuarioId).toBe(estado.usuarios[0].id);

      expect(estado.empresas).toHaveLength(1);
      expect(estado.empresas[0]).toMatchObject({
        nome: 'Empresa Teste',
        cnpj: '12345678000190',
      });

      expect(estado.usuarios).toHaveLength(1);
      expect(estado.usuarios[0]).toMatchObject({
        nome: 'Fulano de Tal',
        email: 'fulano@exemplo.com',
        tipo: 'ADMIN_EMPRESA',
        emailVerificado: true,
        empresaId: estado.empresas[0].id,
        senha: 'hash-fake:12',
      });
      expect(estado.usuarios[0].senha).not.toBe(SENHA);
      expect(bcryptMock.hash).toHaveBeenCalledWith(
        SENHA,
        CUSTO_BCRYPT_CONCLUSAO_CADASTRO,
      );
    });

    it('associa o perfil administrador_empresa com as permissões do perfil padrão', async () => {
      const { service, estado } = criarAmbiente();

      await service.concluir(DADOS_CONCLUSAO);

      expect(estado.perfis).toHaveLength(1);
      expect(estado.perfis[0]).toMatchObject({
        chave: CHAVE_PERFIL_ADMINISTRADOR_EMPRESA,
        escopo: 'EMPRESA',
        sistema: true,
        ativo: true,
        empresaId: estado.empresas[0].id,
      });
      expect(estado.perfilPermissoes).toEqual([
        {
          perfilId: estado.perfis[0].id,
          permissaoId: 'permissao-1',
          permitido: true,
        },
        {
          perfilId: estado.perfis[0].id,
          permissaoId: 'permissao-2',
          permitido: true,
        },
      ]);
      expect(estado.usuarioPerfis).toEqual([
        {
          usuarioId: estado.usuarios[0].id,
          perfilId: estado.perfis[0].id,
          ativo: true,
        },
      ]);
    });

    it('associa exatamente os sete módulos padrão e nunca o CRM', async () => {
      const { service, estado } = criarAmbiente();

      await service.concluir(DADOS_CONCLUSAO);

      const modulos = estado.empresaModulos
        .map((item) => item.moduloId.replace('modulo-', ''))
        .sort();

      expect(modulos).toEqual(
        [
          'agenda',
          'caixa',
          'estoque',
          'fiscal',
          'funcionarios',
          'ordens_servico',
          'vendas',
        ].sort(),
      );
      expect(estado.empresaModulos).toHaveLength(7);
      expect(estado.empresaModulos.every((item) => item.ativo)).toBe(true);
      expect(JSON.stringify(estado.empresaModulos)).not.toContain('crm');
    });

    it('inicia o trial de 30 dias somente ao concluir com sucesso', async () => {
      const { service, estado } = criarAmbiente();
      const antes = Date.now();

      await service.concluir(DADOS_CONCLUSAO);

      const inicio = estado.empresas[0].validadeComercialInicio as Date;
      const fim = estado.empresas[0].validadeComercialFim as Date;

      expect(inicio.getTime()).toBeGreaterThanOrEqual(antes);
      expect(fim.getTime() - inicio.getTime()).toBe(30 * UM_DIA_MS);
    });

    it('registra auditoria do sistema com usuarioId nulo e sem segredos', async () => {
      const { service, estado } = criarAmbiente();

      await service.concluir(DADOS_CONCLUSAO, '203.0.113.10');

      expect(estado.auditoria).toHaveLength(1);
      const evento = estado.auditoria[0];

      expect(evento).toMatchObject({
        acao: 'CONCLUSAO_CADASTRO_PUBLICO',
        entidade: 'Empresa',
        entidadeId: estado.empresas[0].id,
        empresaId: estado.empresas[0].id,
        ip: '203.0.113.10',
      });
      expect(evento.usuarioId).toBeNull();

      const serializado = JSON.stringify(evento);
      expect(serializado).toContain('SISTEMA');
      expect(serializado).not.toContain(TOKEN);
      expect(serializado).not.toContain(TOKEN_HASH);
      expect(serializado).not.toContain(SENHA);
      expect(serializado).not.toContain('hash-fake:12');
    });

    it('consome o token marcando a solicitação como CONCLUIDA', async () => {
      const { service, estado } = criarAmbiente();

      await service.concluir(DADOS_CONCLUSAO);

      expect(estado.solicitacoes[0].estado).toBe('CONCLUIDA');
      expect(estado.solicitacoes[0].usedAt).toBeInstanceOf(Date);
      expect(estado.solicitacoes[0].tokenHash).toBe(TOKEN_HASH);
    });
  });

  describe('token inválido', () => {
    it('rejeita token inexistente sem abrir transação e sem criar nada', async () => {
      const { service, prisma, estado } = criarAmbiente();

      await expect(
        service.concluir({ ...DADOS_CONCLUSAO, token: 'b'.repeat(64) }),
      ).rejects.toThrow(MENSAGEM_TOKEN_CADASTRO_INVALIDO);

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(estado.empresas).toHaveLength(0);
      expect(estado.usuarios).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });

    it('rejeita token expirado preservando a solicitação', async () => {
      const { service, estado } = criarAmbiente({
        solicitacao: { expiresAt: new Date(Date.now() - 1) },
      });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        MENSAGEM_TOKEN_CADASTRO_INVALIDO,
      );

      expect(estado.empresas).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
      expect(estado.solicitacoes[0].usedAt).toBeNull();
    });

    it('rejeita quando o token expira entre a pré-validação e a transação', async () => {
      const { service, estado } = criarAmbiente({ expirarNaTransacao: true });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        MENSAGEM_TOKEN_CADASTRO_INVALIDO,
      );

      expect(estado.empresas).toHaveLength(0);
      expect(estado.usuarios).toHaveLength(0);
      expect(estado.auditoria).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });

    it('rejeita token já utilizado', async () => {
      const { service, estado } = criarAmbiente({
        solicitacao: { usedAt: new Date(Date.now() - 60_000) },
      });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        MENSAGEM_TOKEN_CADASTRO_INVALIDO,
      );

      expect(estado.empresas).toHaveLength(0);
    });

    it('rejeita solicitação já concluída', async () => {
      const { service, estado } = criarAmbiente({
        solicitacao: { estado: 'CONCLUIDA' },
      });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        MENSAGEM_TOKEN_CADASTRO_INVALIDO,
      );

      expect(estado.empresas).toHaveLength(0);
      expect(estado.usuarios).toHaveLength(0);
    });
  });

  describe('senha', () => {
    it('rejeita confirmação divergente antes de tocar o banco', async () => {
      const { service, prisma, estado } = criarAmbiente();

      await expect(
        service.concluir({
          ...DADOS_CONCLUSAO,
          confirmarSenha: 'OutraSenha123',
        }),
      ).rejects.toThrow('As senhas não conferem.');

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(estado.empresas).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });
  });

  describe('conflitos', () => {
    it('conflito de CNPJ retorna 409 controlado e preserva o token', async () => {
      const { service, estado } = criarAmbiente({
        empresasExistentes: [
          {
            id: 'empresa-existente',
            nome: 'Outra Empresa',
            cnpj: '12345678000190',
            validadeComercialInicio: null,
            validadeComercialFim: null,
          },
        ],
      });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        new ConflictException('CNPJ já cadastrado para outra empresa'),
      );

      expect(estado.empresas).toHaveLength(1);
      expect(estado.empresas[0].id).toBe('empresa-existente');
      expect(estado.usuarios).toHaveLength(0);
      expect(estado.perfis).toHaveLength(0);
      expect(estado.empresaModulos).toHaveLength(0);
      expect(estado.auditoria).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
      expect(estado.solicitacoes[0].usedAt).toBeNull();
    });

    it('conflito de e-mail retorna 409 controlado e desfaz a empresa criada', async () => {
      const { service, estado } = criarAmbiente({
        usuariosExistentes: [
          {
            id: 'usuario-existente',
            nome: 'Fulano',
            email: 'fulano@exemplo.com',
            senha: 'hash-antigo',
            tipo: 'USUARIO_EMPRESA',
            emailVerificado: true,
            empresaId: null,
          },
        ],
      });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        new ConflictException('E-mail já cadastrado'),
      );

      expect(estado.empresas).toHaveLength(0);
      expect(estado.usuarios).toHaveLength(1);
      expect(estado.usuarios[0].id).toBe('usuario-existente');
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });
  });

  describe('falhas transacionais e rollback integral', () => {
    const cenarios: Array<{
      nome: string;
      config: ConfiguracaoAmbiente;
      erro: string;
    }> = [
      {
        nome: 'falha na criação da empresa',
        config: { falhas: { empresa: new Error('empresa indisponível') } },
        erro: 'empresa indisponível',
      },
      {
        nome: 'falha na criação do usuário',
        config: { falhas: { usuario: new Error('usuario indisponível') } },
        erro: 'usuario indisponível',
      },
      {
        nome: 'falha na criação do perfil',
        config: { falhas: { perfil: new Error('perfil indisponível') } },
        erro: 'perfil indisponível',
      },
      {
        nome: 'falha na criação das associações de módulos',
        config: { falhas: { modulos: new Error('modulos indisponíveis') } },
        erro: 'modulos indisponíveis',
      },
      {
        nome: 'falha na persistência da validade comercial do trial',
        config: { falhas: { validade: new Error('validade inválida') } },
        erro: 'validade inválida',
      },
      {
        nome: 'falha no registro de auditoria',
        config: { falhas: { auditoria: new Error('auditoria indisponível') } },
        erro: 'auditoria indisponível',
      },
    ];

    it.each(cenarios)(
      '$nome: nenhuma criação parcial permanece e o token continua válido',
      async ({ config, erro }) => {
        const { service, estado } = criarAmbiente(config);

        await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(erro);

        // Rollback integral: nada criado, nada auditado, token intacto.
        expect(estado.empresas).toHaveLength(0);
        expect(estado.usuarios).toHaveLength(0);
        expect(estado.perfis).toHaveLength(0);
        expect(estado.perfilPermissoes).toHaveLength(0);
        expect(estado.usuarioPerfis).toHaveLength(0);
        expect(estado.empresaModulos).toHaveLength(0);
        expect(estado.auditoria).toHaveLength(0);
        expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
        expect(estado.solicitacoes[0].usedAt).toBeNull();
        expect(estado.solicitacoes[0].tokenHash).toBe(TOKEN_HASH);
      },
    );

    it('perfil padrão ausente (seed não executado) falha de forma fechada', async () => {
      const { service, estado } = criarAmbiente({ modeloPerfil: null });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(estado.empresas).toHaveLength(0);
      expect(estado.usuarios).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });

    it('perfil padrão sem permissões falha de forma fechada', async () => {
      const { service, estado } = criarAmbiente({
        modeloPerfil: { id: 'perfil-modelo', permissoes: [] },
      });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(estado.empresas).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });

    it('módulo padrão ausente falha de forma fechada sem associar parcialmente', async () => {
      const { service, estado } = criarAmbiente({
        modulosDisponiveis: MODULOS_PADRAO_ONBOARDING.filter(
          (chave) => chave !== 'fiscal',
        ),
      });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(estado.empresaModulos).toHaveLength(0);
      expect(estado.empresas).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });

    it('token permanece reutilizável após falha (nova tentativa conclui)', async () => {
      const falhas: Partial<Record<OperacaoFalha, Error>> = {
        usuario: new Error('queda temporária'),
      };
      const { service, estado } = criarAmbiente({ falhas });

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        'queda temporária',
      );
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
      expect(estado.empresas).toHaveLength(0);

      // Remove a falha injetada e tenta novamente com o mesmo token.
      delete falhas.usuario;
      const resultado = await service.concluir(DADOS_CONCLUSAO);

      expect(resultado.empresaId).toBe(estado.empresas[0].id);
      expect(estado.solicitacoes[0].estado).toBe('CONCLUIDA');
    });
  });

  describe('concorrência e serialização', () => {
    it('duas conclusões simultâneas com o mesmo token: apenas uma conclui', async () => {
      const { service, estado } = criarAmbiente();

      const resultados = await Promise.allSettled([
        service.concluir(DADOS_CONCLUSAO),
        service.concluir(DADOS_CONCLUSAO),
      ]);

      const sucessos = resultados.filter((item) => item.status === 'fulfilled');
      const falhas = resultados.filter((item) => item.status === 'rejected');

      expect(sucessos).toHaveLength(1);
      expect(falhas).toHaveLength(1);
      expect(falhas[0].reason).toBeInstanceOf(BadRequestException);

      expect(estado.empresas).toHaveLength(1);
      expect(estado.usuarios).toHaveLength(1);
      expect(estado.perfis).toHaveLength(1);
      expect(estado.auditoria).toHaveLength(1);
      expect(estado.solicitacoes[0].estado).toBe('CONCLUIDA');
    });

    it('reprocessa conflito de serialização P2034 e conclui na tentativa seguinte', async () => {
      const { service, tx, estado } = criarAmbiente();
      tx.empresa.create.mockRejectedValueOnce(criarP2034());

      const resultado = await service.concluir(DADOS_CONCLUSAO);

      expect(resultado.empresaId).toBe(estado.empresas[0].id);
      expect(tx.empresa.create).toHaveBeenCalledTimes(2);
      expect(estado.empresas).toHaveLength(1);
      expect(estado.solicitacoes[0].estado).toBe('CONCLUIDA');
    });

    it('reprocessa SQLSTATE 40001 (P2010) e conclui na tentativa seguinte', async () => {
      const { service, tx, estado } = criarAmbiente();
      tx.empresa.create.mockRejectedValueOnce(criarP2010('40001'));

      const resultado = await service.concluir(DADOS_CONCLUSAO);

      expect(resultado.empresaId).toBe(estado.empresas[0].id);
      expect(estado.solicitacoes[0].estado).toBe('CONCLUIDA');
    });

    it('esgotadas as tentativas de serialização, retorna 409 sem criar nada', async () => {
      const { service, tx, estado } = criarAmbiente();
      tx.empresa.create.mockRejectedValue(criarP2034());

      await expect(service.concluir(DADOS_CONCLUSAO)).rejects.toThrow(
        new ConflictException('Alteração concorrente. Tente novamente.'),
      );

      expect(tx.empresa.create).toHaveBeenCalledTimes(3);
      expect(estado.empresas).toHaveLength(0);
      expect(estado.solicitacoes[0].estado).toBe('PENDENTE');
    });
  });

  describe('contrato de rate limit da conclusão', () => {
    it('mantém limite de 5 e chave própria da conclusão', () => {
      expect(LIMITE_CONCLUSAO_CADASTRO).toBe(5);
      expect(ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO).toBe(
        'cadastro-publico/conclusao',
      );
      expect(ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO).not.toBe(
        'cadastro-publico/cadastro',
      );
    });

    it('não expõe ids internos da solicitação na resposta', async () => {
      const { service } = criarAmbiente();

      const resultado = await service.concluir(DADOS_CONCLUSAO);
      const serializado = JSON.stringify(resultado);

      expect(serializado).not.toContain('sol-1');
      expect(serializado).not.toContain(TOKEN);
      expect(serializado).not.toContain(TOKEN_HASH);
    });
  });
});
