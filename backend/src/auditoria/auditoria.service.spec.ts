import {
  AuditoriaAcao,
  AuditoriaEntidade,
} from '../common/enums/auditoria.enum';
import { PrismaService } from '../prisma/prisma.service';
import { AuditoriaService } from './auditoria.service';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  type Where = {
    empresaId?: string;
    acao?: string;
    entidade?: string;
    usuarioId?: string;
    entidadeId?: string;
    OR?: unknown[];
  };
  type FindManyArgs = {
    where: Where;
    orderBy: Record<string, 'asc' | 'desc'>;
    select: { usuario: { select: Record<string, boolean> } };
    skip: number;
    take: number;
  };
  type CountArgs = { where: Where };
  type CreateArgs = { data: Record<string, unknown> };

  const findMany = jest.fn<Promise<unknown[]>, [FindManyArgs]>();
  const count = jest.fn<Promise<number>, [CountArgs]>();
  const create = jest.fn<Promise<unknown>, [CreateArgs]>();
  const transaction = jest.fn((operacoes: Array<Promise<unknown>>) =>
    Promise.all(operacoes),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    service = new AuditoriaService({
      auditoriaLog: { create, findMany, count },
      $transaction: transaction,
    } as unknown as PrismaService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('lista a empresa com tenant obrigatório, filtros e paginação', async () => {
    findMany.mockResolvedValue([{ id: 'log-1' }]);
    count.mockResolvedValue(1);

    const resultado = await service.listarEmpresa('empresa-1', {
      acao: AuditoriaAcao.ATUALIZAR,
      entidade: AuditoriaEntidade.PRODUTO,
      usuarioId: 'usuario-1',
      entidadeId: 'entidade-1',
      page: 2,
      limit: 5,
      sortBy: 'acao',
      order: 'asc',
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: 'empresa-1',
          acao: AuditoriaAcao.ATUALIZAR,
          entidade: AuditoriaEntidade.PRODUTO,
          usuarioId: 'usuario-1',
          entidadeId: 'entidade-1',
        },
        orderBy: { acao: 'asc' },
        skip: 5,
        take: 5,
      }),
    );
    expect(resultado.data).toEqual([{ id: 'log-1' }]);
    expect(resultado.meta).toEqual({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
    });
  });

  it('combina search com o tenant e usa o mesmo where no findMany e count', async () => {
    await service.listarEmpresa('empresa-1', { search: '  ACME  ' });

    const whereFindMany = findMany.mock.calls[0][0].where;
    const whereCount = count.mock.calls[0][0].where;
    expect(whereFindMany).toBe(whereCount);
    expect(whereFindMany.empresaId).toBe('empresa-1');
    expect(whereFindMany.OR).toEqual(
      expect.arrayContaining([
        { entidade: { contains: 'ACME', mode: 'insensitive' } },
        { entidadeId: { contains: 'ACME', mode: 'insensitive' } },
        { ip: { contains: 'ACME', mode: 'insensitive' } },
      ]),
    );
  });

  it('não possui modo global no método empresarial', async () => {
    await service.listarEmpresa('empresa-1', {});
    expect(findMany.mock.calls[0][0].where).toEqual({ empresaId: 'empresa-1' });
  });

  it('lista globalmente sem empresaId e permite registros nulos', async () => {
    await service.listarGlobal({});
    expect(findMany.mock.calls[0][0].where).toEqual({});
    expect(count.mock.calls[0][0].where).toBe(findMany.mock.calls[0][0].where);
  });

  it('restringe a listagem global quando empresaId é informado', async () => {
    await service.listarGlobal({ empresaId: 'empresa-2' });
    expect(findMany.mock.calls[0][0].where).toEqual({ empresaId: 'empresa-2' });
  });

  it('mantém filtros globais independentes do método empresarial', async () => {
    await service.listarGlobal({
      empresaId: 'empresa-2',
      entidade: AuditoriaEntidade.EMPRESA,
      search: 'admin',
    });
    expect(findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        empresaId: 'empresa-2',
        entidade: AuditoriaEntidade.EMPRESA,
      }),
    );
  });

  it('aplica fallback seguro para sortBy desconhecido', async () => {
    await service.listarEmpresa('empresa-1', {
      sortBy: 'dadosNovos' as never,
    });
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });

  it('aplica fallback seguro para order desconhecido', async () => {
    await service.listarEmpresa('empresa-1', {
      sortBy: 'entidade',
      order: 'invalid' as never,
    });
    expect(findMany.mock.calls[0][0].orderBy).toEqual({ entidade: 'desc' });
  });

  it('preserva o select sem campos sensíveis adicionais', async () => {
    await service.listarEmpresa('empresa-1', {});
    const select = findMany.mock.calls[0][0].select;
    expect(select.usuario.select).toEqual({
      id: true,
      nome: true,
      email: true,
      tipo: true,
      ativo: true,
      empresaId: true,
    });
    expect(select.usuario.select).not.toHaveProperty('senha');
  });

  it('retorna envelope paginado vazio', async () => {
    const resultado = await service.listarEmpresa('empresa-1', {
      page: 1,
      limit: 10,
    });
    expect(resultado.data).toEqual([]);
    expect(resultado.meta).toEqual({
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
  });

  it('preserva a gravação existente de logs', async () => {
    create.mockResolvedValue({ id: 'log-1' });
    await service.registrar({
      acao: 'CRIAR',
      entidade: 'PRODUTO',
      empresaId: 'empresa-1',
      usuarioId: 'usuario-1',
    });
    expect(create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        acao: 'CRIAR',
        entidade: 'PRODUTO',
        empresaId: 'empresa-1',
        usuarioId: 'usuario-1',
      }),
    );
  });
});
