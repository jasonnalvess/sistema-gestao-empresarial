import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IpUtil } from '../utils/ip.util';
import { Request } from 'express';

@Injectable()
export class RateLimitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ipUtil: IpUtil,
  ) {}

  private readonly logger = new Logger(RateLimitService.name);

  /**
   * Verifica e incrementa o rate limit para um IP e endpoint específicos.
   * Janela de 15 minutos.
   *
   * @throws ForbiddenException se o limite for excedido.
   */
  async checkLimit(
    req: Request,
    endpoint: string,
    limit: number = 5,
  ): Promise<void> {
    const ip = this.ipUtil.getRealIp(req);
    const now = new Date();
    const windowMinutes = 15;

    const windowStart = new Date(
      Math.floor(now.getTime() / (windowMinutes * 60 * 1000)) *
        (windowMinutes * 60 * 1000),
    );
    const windowEnd = new Date(
      windowStart.getTime() + windowMinutes * 60 * 1000,
    );

    // Implementação atômica via SQL Raw para evitar Race Condition
    // Utilizamos INSERT ... ON CONFLICT para garantir que o incremento seja atômico no banco.
    // Nota: Requer constraint UNIQUE em (clientIp, endpoint, windowStart).
    try {
      const result = await this.prisma.$executeRaw`
        INSERT INTO "RateLimit" ("id", "clientIp", "endpoint", "count", "windowStart", "windowEnd")
        VALUES (gen_random_uuid(), ${ip}, ${endpoint}, 1, ${windowStart}, ${windowEnd})
        ON CONFLICT ("clientIp", "endpoint", "windowStart")
        DO UPDATE SET "count" = "RateLimit"."count" + 1
        RETURNING "count";
      `;

      // Como $executeRaw retorna o número de linhas afetadas,
      // precisamos de $queryRaw para obter o valor final do count.
      const counts = await this.prisma.$queryRaw<any[]>`
        SELECT "count" FROM "RateLimit"
        WHERE "clientIp" = ${ip} AND "endpoint" = ${endpoint} AND "windowStart" = ${windowStart}
      `;

      const currentCount = (counts && counts[0])?.count;

      if (currentCount && currentCount > limit) {
        throw new ForbiddenException(
          'Limite de solicitações excedido. Tente novamente em alguns minutos.',
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;

      // Se houver erro de banco, não permitimos o bypass silencioso.
      this.logger.error(`Erro no RateLimit: ${error.message}`);
      throw new InternalServerErrorException(
        'Erro interno ao processar limite de requisições.',
      );
    }
  }
}
