import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { CaixasController } from './caixas.controller';
import { CaixasService } from './caixas.service';

@Module({
  imports: [PrismaModule],
  controllers: [CaixasController],
  providers: [CaixasService],
})
export class CaixasModule {}
