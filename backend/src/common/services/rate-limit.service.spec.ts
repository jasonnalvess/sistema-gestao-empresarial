import {
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { IpUtil } from '../utils/ip.util';

type RawQueryCall = [TemplateStringsArray, ...unknown[]];

describe('RateLimitService', () => {
  let service: RateLimitService;
  let queryRaw: jest.Mock;
  let executeRaw: jest.Mock;

  const request = {} as Request;
  const endpoint = 'auth/esqueci-senha';
  const clientIp = '203.0.113.10';

  beforeEach(() => {
    queryRaw = jest.fn();
    executeRaw = jest.fn();

    const prisma = {
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as unknown as PrismaService;

    const ipUtil = {
      getRealIp: jest.fn().mockReturnValue(clientIp),
    } as unknown as IpUtil;

    service = new RateLimitService(prisma, ipUtil);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function capturedSql(call: RawQueryCall): string {
    const [strings] = call;
    return strings.join('?');
  }

  it('executa uma única instrução parametrizada com RETURNING', async () => {
    queryRaw.mockResolvedValue([{ count: 1 }]);

    await service.checkLimit(request, endpoint);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(executeRaw).not.toHaveBeenCalled();

    const call = queryRaw.mock.calls[0] as RawQueryCall;
    const sql = capturedSql(call);
    const values = call.slice(1);

    expect(sql).toContain('INSERT INTO "RateLimit"');
    expect(sql).toContain(
      'ON CONFLICT ("clientIp", "endpoint", "windowStart")',
    );
    expect(sql).toContain('RETURNING "count"');
    expect(sql).toContain('gen_random_uuid()::text');
    expect(sql).not.toMatch(/\bSELECT\b/i);
    expect(sql).not.toMatch(/\bWHERE\b/i);
    expect(sql.match(/;/g)).toHaveLength(1);

    expect(values).toHaveLength(4);
    expect(values).toEqual(expect.arrayContaining([clientIp, endpoint]));
    expect(sql).not.toContain(clientIp);
    expect(sql).not.toContain(endpoint);
  });

  it.each([1, 4, 5])(
    'permite quando o contador retornado é %i com limite 5',
    async (count) => {
      queryRaw.mockResolvedValue([{ count }]);

      await expect(
        service.checkLimit(request, endpoint, 5),
      ).resolves.toBeUndefined();
      expect(queryRaw).toHaveBeenCalledTimes(1);
    },
  );

  it('bloqueia quando o contador retornado excede o limite', async () => {
    queryRaw.mockResolvedValue([{ count: 6 }]);

    await expect(
      service.checkLimit(request, endpoint, 5),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('bloqueia quando o RETURNING não retorna nenhuma linha', async () => {
    queryRaw.mockResolvedValue([]);

    await expect(
      service.checkLimit(request, endpoint, 5),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('falha fechado quando o banco retorna erro', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    queryRaw.mockRejectedValue(
      new Error('relation "RateLimit" does not exist'),
    );

    await expect(
      service.checkLimit(request, endpoint, 5),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
