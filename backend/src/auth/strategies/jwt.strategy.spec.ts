import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../types/jwt-payload.type';
import {
  CODIGO_EMPRESA_INATIVA,
  CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
  CODIGO_VALIDADE_COMERCIAL_INVALIDA,
} from '../../common/validacao-comercial/situacao-comercial';
import { JwtStrategy } from './jwt.strategy';

const EMPRESA_ID = 'empresa-1';

const agora = Date.now();
const UM_DIA = 24 * 60 * 60 * 1000;

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const prisma = { usuario: { findUnique: jest.fn() } };
  const payload: JwtPayload = {
    id: 'usuario-1',
    email: 'usuario@sistema.com',
    tipo: 'USUARIO_EMPRESA',
    empresaId: EMPRESA_ID,
    versaoAutorizacao: 0,
    perfis: ['colaborador'],
    permissoes: ['agenda.visualizar', 'clientes.visualizar'],
  };
  const empresaBase: {
    ativa: boolean;
    validadeComercialInicio: Date | null;
    validadeComercialFim: Date | null;
  } = {
    ativa: true,
    validadeComercialInicio: null,
    validadeComercialFim: null,
  };
  const usuario = {
    ativo: true,
    trocaSenhaObrigatoria: false,
    emailVerificado: true,
    versaoAutorizacao: 0,
    tipo: payload.tipo,
    empresaId: payload.empresaId,
    empresa: empresaBase,
  };
  const comEmpresa = (
    empresa: Partial<{
      ativa: boolean;
      validadeComercialInicio: Date | null;
      validadeComercialFim: Date | null;
    }>,
  ) => ({
    ...usuario,
    empresa: { ...empresaBase, ...empresa },
  });
  const vigente = {
    validadeComercialInicio: new Date(agora - UM_DIA),
    validadeComercialFim: new Date(agora + UM_DIA),
  };
  const expirada = {
    validadeComercialInicio: new Date(agora - 2 * UM_DIA),
    validadeComercialFim: new Date(agora - 1),
  };
  const futura = {
    validadeComercialInicio: new Date(agora + UM_DIA),
    validadeComercialFim: new Date(agora + 2 * UM_DIA),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.usuario.findUnique.mockResolvedValue(usuario);
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('segredo-teste'),
    } as unknown as ConfigService;
    strategy = new JwtStrategy(
      configService,
      prisma as unknown as PrismaService,
    );
  });

  it('autentica usuário ativo e preserva claims', async () => {
    await expect(strategy.validate(payload)).resolves.toMatchObject({
      ...payload,
      situacaoComercial: 'SEM_VALIDADE_LIMITADA',
      codigoBloqueio: null,
    });
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { id: payload.id },
      select: {
        ativo: true,
        trocaSenhaObrigatoria: true,
        emailVerificado: true,
        versaoAutorizacao: true,
        tipo: true,
        empresaId: true,
        empresa: {
          select: {
            ativa: true,
            validadeComercialInicio: true,
            validadeComercialFim: true,
          },
        },
      },
    });
  });

  it.each([
    ['inexistente', null],
    ['inativo', { ...usuario, ativo: false }],
    ['versão divergente', { ...usuario, versaoAutorizacao: 1 }],
    ['tipo alterado', { ...usuario, tipo: 'ADMIN_EMPRESA' }],
    ['empresa alterada', { ...usuario, empresaId: 'empresa-2' }],
    ['e-mail não verificado', { ...usuario, emailVerificado: false }],
  ])('rejeita usuário %s', async (_cenario, estado) => {
    prisma.usuario.findUnique.mockResolvedValue(estado);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejeita token já emitido de usuário com e-mail não verificado', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      emailVerificado: false,
    });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // Mesma resposta genérica dos demais motivos: o estado da conta não é
    // revelado ao portador do token.
    await expect(strategy.validate(payload)).rejects.toMatchObject({
      message: 'Sessão inválida. Faça login novamente.',
    });
  });

  it.each([undefined, -1, 0.5, NaN])(
    'rejeita versão ausente ou inválida: %s',
    async (versaoAutorizacao) => {
      await expect(
        strategy.validate({ ...payload, versaoAutorizacao }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    },
  );

  it('não reabilita token anterior depois de reativação com versão incrementada', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      ativo: true,
      versaoAutorizacao: 1,
    });
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      strategy.validate({ ...payload, versaoAutorizacao: 1 }),
    ).resolves.toMatchObject({ versaoAutorizacao: 1 });
  });

  it('não autentica quando a consulta persistida falha', async () => {
    prisma.usuario.findUnique.mockRejectedValue(
      new Error('banco indisponível'),
    );
    const resultado = strategy.validate(payload);
    await expect(resultado).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(resultado).rejects.toMatchObject({
      message: 'Sessão inválida. Faça login novamente.',
      response: {
        statusCode: 401,
        message: 'Sessão inválida. Faça login novamente.',
      },
    });
    await expect(resultado).rejects.not.toThrow('banco indisponível');
  });

  it('empresa legada (ambos nulos) permanece sem validade limitada', async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuario);

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      situacaoComercial: 'SEM_VALIDADE_LIMITADA',
      codigoBloqueio: null,
    });
  });

  it('empresa vigente não é bloqueada', async () => {
    prisma.usuario.findUnique.mockResolvedValue(comEmpresa(vigente));

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      situacaoComercial: 'VIGENTE',
      codigoBloqueio: null,
    });
  });

  it('empresa expirada é bloqueada com código próprio', async () => {
    prisma.usuario.findUnique.mockResolvedValue(comEmpresa(expirada));

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      situacaoComercial: 'EXPIRADA',
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
    });
  });

  it('validade ainda não iniciada é bloqueada', async () => {
    prisma.usuario.findUnique.mockResolvedValue(comEmpresa(futura));

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      situacaoComercial: 'NAO_INICIADA',
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
    });
  });

  it('dados comerciais inconsistentes bloqueiam (fail-closed)', async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      comEmpresa({
        validadeComercialInicio: new Date(agora),
        validadeComercialFim: new Date(agora),
      }),
    );

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      situacaoComercial: 'INVALIDA',
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
    });
  });

  it('suspensão administrativa tem código distinto da expiração', async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      comEmpresa({ ativa: false, ...vigente }),
    );

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      codigoBloqueio: CODIGO_EMPRESA_INATIVA,
    });
  });

  it('suspensão administrativa prevalece sobre validade expirada', async () => {
    prisma.usuario.findUnique.mockResolvedValue(
      comEmpresa({ ativa: false, ...expirada }),
    );

    const resultado = await strategy.validate(payload);

    expect(resultado.codigoBloqueio).toBe(CODIGO_EMPRESA_INATIVA);
    expect(resultado.situacaoComercial).toBe('EXPIRADA');
  });

  it('empresa ausente para usuário empresarial bloqueia (fail-closed)', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuario,
      empresa: null,
    });

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      situacaoComercial: 'INVALIDA',
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
    });
  });

  it('SUPER_ADMIN global é isento do bloqueio comercial', async () => {
    const payloadSuperAdmin: JwtPayload = {
      id: 'super-1',
      email: 'super@sistema.com',
      tipo: 'SUPER_ADMIN',
      empresaId: null,
      versaoAutorizacao: 3,
      perfis: ['super_administrador'],
      permissoes: [],
    };
    prisma.usuario.findUnique.mockResolvedValue({
      ativo: true,
      trocaSenhaObrigatoria: false,
      emailVerificado: true,
      versaoAutorizacao: 3,
      tipo: 'SUPER_ADMIN',
      empresaId: null,
      empresa: null,
    });

    const resultado = await strategy.validate(payloadSuperAdmin);

    expect(resultado.codigoBloqueio).toBeNull();
    expect(resultado.situacaoComercial).toBeUndefined();
  });

  it('não depende do timezone do processo', async () => {
    const timezoneOriginal = process.env.TZ;
    prisma.usuario.findUnique.mockResolvedValue(comEmpresa(vigente));

    try {
      for (const timezone of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo']) {
        process.env.TZ = timezone;
        await expect(strategy.validate(payload)).resolves.toMatchObject({
          situacaoComercial: 'VIGENTE',
          codigoBloqueio: null,
        });
      }
    } finally {
      process.env.TZ = timezoneOriginal;
    }
  });
});
