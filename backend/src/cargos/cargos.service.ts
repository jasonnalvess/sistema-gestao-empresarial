import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstruturaRhService } from '../cargos/estrutura-rh.service';
@Injectable()
export class CargosService extends EstruturaRhService {
  constructor(prisma: PrismaService) {
    super(prisma, 'cargo');
  }
}
