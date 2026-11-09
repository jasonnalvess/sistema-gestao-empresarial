import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IpUtil } from '../utils/ip.util';
import { Request } from 'express';

interface RateLimitCountRow {
  count: number;
}

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

    try {
      // Uma única instrução parametrizada. O incremento e a leitura do valor
      // resultante pertencem à mesma instrução (RETURNING), eliminando a
      // janela de corrida de um SELECT separado.
      const rows = await this.prisma.$queryRaw<RateLimitCountRow[]>`
        INSERT INTO "RateLimit" ("id", "clientIp", "endpoint", "count", "windowStart", "windowEnd")
        VALUES (gen_random_uuid()::text, ${ip}, ${endpoint}, 1, ${windowStart}, ${windowEnd})
        ON CONFLICT ("clientIp", "endpoint", "windowStart")
        DO UPDATE SET "count" = "RateLimit"."count" + 1
        RETURNING "count";
      `;

      // Retorno vazio nunca autoriza: falha fechada.
      const currentCount = rows.length > 0 ? rows[0].count : null;

      if (currentCount === null || currentCount > limit) {
        throw new ForbiddenException(
          'Limite de solicitações excedido. Tente novamente em alguns minutos.',
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;

      // Se houver erro de banco, não permitimos o bypass silencioso.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro no RateLimit: ${message}`);
      throw new InternalServerErrorException(
        'Erro interno ao processar limite de requisições.',
      );
    }
  }
}
