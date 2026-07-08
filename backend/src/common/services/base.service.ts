import { PrismaService } from '../../prisma/prisma.service';

export abstract class BaseService {
  constructor(
    protected readonly prisma: PrismaService,
  ) {}
}
