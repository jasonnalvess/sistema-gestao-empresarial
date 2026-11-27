import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { EmpresasService } from './empresas.service';

const ID = '11111111-1111-4111-8111-111111111111';
const ATOR: AuthenticatedUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'super@sistema.com',
  tipo: 'SUPER_ADMIN',
  empresaId: null,
};
const IP = '203.0.113.10';
const UM_DIA = 24 * 60 * 60 * 1000;

type EmpresaEstado = {
  id: string;
  nome: string;
  ativa: boolean;
  validadeComercialInicio: Date | null;
  validadeComercialFim: Date | null;
};

type AuditoriaCriada = {
  acao: string;
  entidade: string;
  entidadeId: string;
  dadosAntigos: Record<string, unknown>;
  dadosNovos: Record<string, unknown>;
  empresaId: string;
  usuarioId: string;
  ip?: string;
};

function criarAmbiente(opcoes?: {
  empresa?: EmpresaEstado | null;
  falhaAuditoria?: boolean;
}) {
  const estado: {
    empresa: EmpresaEstado | null;
    auditorias: AuditoriaCriada[];
  } = {
    empresa:
      opcoes && Object.prototype.hasOwnProperty.call(opcoes, 'empresa')
        ? opcoes.empresa
          ? { ...opcoes.empresa }
          : null
        : {
            id: ID,
            nome: 'Empresa Trial',
            ativa: true,
            validadeComercialInicio: null,
            validadeComercialFim: null,
          },
    auditorias: [],
  };
  const metricas = {
    transacoes: 0,
    rollbacks: 0,
    locks: 0,
    updates: 0,
  };

  const tx = {
    $queryRaw: jest.fn(async () => {
      await Promise.resolve();
      metricas.locks += 1;
      return estado.empresa ? [{ id: estado.empresa.id }] : [];
    }),
    empresa: {
      findUnique: jest.fn(async () => {
        await Promise.resolve();
        return estado.empresa ? { ...estado.empresa } : null;
      }),
      update: jest.fn(async ({ data }: { data: Partial<EmpresaEstado> }) => {
        await Promise.resolve();
        metricas.updates += 1;
        if (!estado.empresa) throw new Error('empresa ausente');
        Object.assign(estado.empresa, data);
        return { ...estado.empresa };
      }),
    },
    auditoriaLog: {
      create: jest.fn(async ({ data }: { data: AuditoriaCriada }) => {
        await Promise.resolve();
        if (opcoes?.falhaAuditoria) {
          throw new Error('falha simulada na auditoria');
        }
        estado.auditorias.push(data);
        return data;
      }),
    },
  };

  // Qualquer acesso a entidades fora do escopo (usuários, perfis, módulos,
  // permissões) falha explicitamente.
  const txProtegido = new Proxy(tx, {
    get(alvo, propriedade) {
      if (propriedade in alvo) {
        return alvo[propriedade as keyof typeof alvo];
      }
      throw new Error(
        `Acesso indevido a entidade fora do escopo: ${String(propriedade)}`,
      );
    },
  });

  // Emula o PostgreSQL: transações no mesmo banco são serializadas; falha
  // restaura o snapshot anterior (rollback integral).
  let corrente: Promise<unknown> = Promise.resolve();
  const prisma = {
    $transaction: jest.fn(
      (
        fn: (cliente: typeof tx) => Promise<unknown>,
        opcoesTransacao: unknown,
      ) => {
        metricas.transacoes += 1;
        const execucao = corrente.then(async () => {
          const snapshot = structuredClone(estado);
          try {
            return await fn(txProtegido);
          } catch (erro) {
            metricas.rollbacks += 1;
            Object.assign(estado, snapshot);
            throw erro;
          }
        });
        corrente = execucao.catch(() => undefined);
        void opcoesTransacao;
        return execucao;
      },
    ),
  };

  const service = new EmpresasService(prisma as unknown as PrismaService);
  return { service, prisma, estado, metricas, tx };
}

describe('EmpresasService.regularizar', () => {
  it('define nova janela comercial e audita na mesma transação', async () => {
    const { service, estado, prisma, tx } = criarAmbiente();
    const antes = Date.now();

    const resultado = await service.regularizar(
      ID,
      { diasValidade: 30, motivo: 'Contrato regularizado' },
      ATOR,
      IP,
    );

    expect(resultado.ativa).toBe(true);
    expect(resultado.validadeComercialInicio).toBeInstanceOf(Date);
    expect(resultado.validadeComercialFim).toBeInstanceOf(Date);
    expect(
      resultado.validadeComercialFim!.getTime() -
        resultado.validadeComercialInicio!.getTime(),
    ).toBe(30 * UM_DIA);
    expect(resultado.validadeComercialInicio!.getTime()).toBeGreaterThanOrEqual(
      antes - 1000,
    );

    expect(estado.auditorias).toHaveLength(1);
    expect(estado.auditorias[0]).toMatchObject({
      acao: 'REGULARIZACAO_COMERCIAL',
      entidade: 'Empresa',
      entidadeId: ID,
      empresaId: ID,
      usuarioId: ATOR.id,
      ip: IP,
      dadosAntigos: {
        ativa: true,
        validadeComercialInicio: null,
        validadeComercialFim: null,
      },
    });
    expect(estado.auditorias[0].dadosNovos).toEqual({
      ativa: true,
      validadeComercialInicio: resultado.validadeComercialInicio!.toISOString(),
      validadeComercialFim: resultado.validadeComercialFim!.toISOString(),
      diasValidade: 30,
      motivo: 'Contrato regularizado',
    });

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
      timeout: 15000,
      maxWait: 5000,
    });
    expect(tx.empresa.update).toHaveBeenCalledTimes(1);
  });

  it('adquire o lock da empresa antes de ler e escrever', async () => {
    const { service, tx } = criarAmbiente();

    await service.regularizar(
      ID,
      { diasValidade: 1, motivo: 'Renovação mínima' },
      ATOR,
    );

    const ordem = (mock: { mock: { invocationCallOrder: number[] } }) =>
      mock.mock.invocationCallOrder[0];

    expect(ordem(tx.$queryRaw)).toBeLessThan(ordem(tx.empresa.findUnique));
    expect(ordem(tx.empresa.findUnique)).toBeLessThan(ordem(tx.empresa.update));
    expect(ordem(tx.empresa.update)).toBeLessThan(
      ordem(tx.auditoriaLog.create),
    );
  });

  it('preserva a suspensão administrativa existente', async () => {
    const { service, estado } = criarAmbiente({
      empresa: {
        id: ID,
        nome: 'Empresa Suspensa',
        ativa: false,
        validadeComercialInicio: null,
        validadeComercialFim: null,
      },
    });

    const resultado = await service.regularizar(
      ID,
      { diasValidade: 30, motivo: 'Regularização comercial' },
      ATOR,
    );

    expect(resultado.ativa).toBe(false);
    expect(estado.empresa?.ativa).toBe(false);
    expect(estado.auditorias[0].dadosAntigos).toMatchObject({ ativa: false });
  });

  it('remove espaços do motivo antes de auditar', async () => {
    const { service, estado } = criarAmbiente();

    await service.regularizar(
      ID,
      { diasValidade: 30, motivo: '  Contrato renovado  ' },
      ATOR,
    );

    expect(estado.auditorias[0].dadosNovos.motivo).toBe('Contrato renovado');
  });

  it('retorna 404 para empresa inexistente sem escrever', async () => {
    const { service, estado, tx } = criarAmbiente({ empresa: null });

    await expect(
      service.regularizar(
        ID,
        { diasValidade: 30, motivo: 'Contrato novo' },
        ATOR,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(tx.empresa.update).not.toHaveBeenCalled();
    expect(tx.auditoriaLog.create).not.toHaveBeenCalled();
    expect(estado.auditorias).toHaveLength(0);
  });

  it('falha da auditoria provoca rollback integral', async () => {
    const { service, estado, metricas } = criarAmbiente({
      falhaAuditoria: true,
    });

    await expect(
      service.regularizar(
        ID,
        { diasValidade: 30, motivo: 'Contrato regularizado' },
        ATOR,
      ),
    ).rejects.toThrow('falha simulada na auditoria');

    expect(metricas.rollbacks).toBe(1);
    expect(estado.empresa?.validadeComercialInicio).toBeNull();
    expect(estado.empresa?.validadeComercialFim).toBeNull();
    expect(estado.auditorias).toHaveLength(0);
  });

  it.each([0, -1, 1.5, 3651, NaN])(
    'recusa diasValidade inválido antes de qualquer escrita: %s',
    async (diasValidade) => {
      const { service, metricas } = criarAmbiente();

      await expect(
        service.regularizar(
          ID,
          { diasValidade, motivo: 'Contrato regularizado' },
          ATOR,
        ),
      ).rejects.toThrow('Período comercial inválido.');

      expect(metricas.updates).toBe(0);
      expect(metricas.rollbacks).toBe(1);
    },
  );

  it('regularizações concorrentes são serializadas pelo lock', async () => {
    const { service, estado, metricas } = criarAmbiente();

    const [primeira, segunda] = await Promise.all([
      service.regularizar(
        ID,
        { diasValidade: 10, motivo: 'Primeira renovação' },
        ATOR,
      ),
      service.regularizar(
        ID,
        { diasValidade: 20, motivo: 'Segunda renovação' },
        ATOR,
      ),
    ]);

    expect(metricas.locks).toBe(2);
    expect(metricas.transacoes).toBe(2);
    expect(estado.auditorias).toHaveLength(2);
    expect(estado.auditorias.map((a) => a.dadosNovos.motivo)).toEqual([
      'Primeira renovação',
      'Segunda renovação',
    ]);
    // A última transação vence e permanece consistente com a última auditoria.
    expect(estado.empresa?.validadeComercialFim).toEqual(
      segunda.validadeComercialFim,
    );
    expect(
      segunda.validadeComercialFim!.getTime() >
        primeira.validadeComercialFim!.getTime(),
    ).toBe(true);
  });

  it('não expõe segredos na auditoria', async () => {
    const { service, estado } = criarAmbiente();

    await service.regularizar(
      ID,
      { diasValidade: 30, motivo: 'Contrato regularizado' },
      ATOR,
      IP,
    );

    const serializado = JSON.stringify(estado.auditorias).toLowerCase();
    expect(serializado).not.toContain('senha');
    expect(serializado).not.toContain('hash');
    expect(serializado).not.toContain('token');
    expect(serializado).not.toContain('authorization');
  });
});

describe('EmpresasService — conflito de CNPJ (P2002)', () => {
  const CNPJ = '12345678000199';

  function erroP2002(target: string[]) {
    return new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the constraint',
      {
        code: 'P2002',
        clientVersion: 'teste-unitario',
        meta: { target },
      },
    );
  }

  function criarService(empresa: {
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
  }) {
    const prisma = {
      empresa: {
        findUnique: empresa.findUnique ?? jest.fn(),
        create: empresa.create ?? jest.fn(),
        update: empresa.update ?? jest.fn(),
      },
    } as unknown as PrismaService;
    return new EmpresasService(prisma);
  }

  it('criar sem conflito mantém o comportamento original', async () => {
    const retorno = { id: ID, nome: 'Empresa Nova', cnpj: CNPJ };
    const create = jest.fn(() => retorno);
    const service = criarService({ create });

    await expect(
      service.criar({ nome: 'Empresa Nova', cnpj: CNPJ }),
    ).resolves.toBe(retorno);
    expect(create).toHaveBeenCalledWith({
      data: { nome: 'Empresa Nova', cnpj: CNPJ },
    });
  });

  it('criar com CNPJ duplicado responde 409 com mensagem específica', async () => {
    const create = jest.fn(() => {
      throw erroP2002(['cnpj']);
    });
    const service = criarService({ create });

    await expect(
      service.criar({ nome: 'Empresa Nova', cnpj: CNPJ }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      service.criar({ nome: 'Empresa Nova', cnpj: CNPJ }),
    ).rejects.toThrow('CNPJ já cadastrado para outra empresa');
  });

  it('atualizar com CNPJ duplicado responde 409 com mensagem específica', async () => {
    const update = jest.fn(() => {
      throw erroP2002(['cnpj']);
    });
    const service = criarService({
      findUnique: jest.fn(() => ({ id: ID, nome: 'Empresa Editada' })),
      update,
    });

    await expect(
      service.atualizar(ID, { nome: 'Empresa Editada', cnpj: CNPJ }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(service.atualizar(ID, { cnpj: CNPJ })).rejects.toThrow(
      'CNPJ já cadastrado para outra empresa',
    );
  });

  it('conflito P2002 em campo distinto de CNPJ é propagado sem alteração', async () => {
    const erro = erroP2002(['campo_distinto']);
    const create = jest.fn(() => {
      throw erro;
    });
    const service = criarService({ create });

    await expect(service.criar({ nome: 'Empresa Nova' })).rejects.toBe(erro);
  });

  it('erro genérico de criação é propagado sem alteração', async () => {
    const create = jest.fn(() => {
      throw new Error('falha de banco');
    });
    const service = criarService({ create });

    await expect(
      service.criar({ nome: 'Empresa Nova', cnpj: CNPJ }),
    ).rejects.toThrow('falha de banco');
  });

  it('atualizar empresa inexistente permanece 404 e não escreve', async () => {
    const update = jest.fn();
    const service = criarService({
      findUnique: jest.fn(() => null),
      update,
    });

    await expect(
      service.atualizar(ID, { nome: 'Empresa Editada' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(update).not.toHaveBeenCalled();
  });
});
