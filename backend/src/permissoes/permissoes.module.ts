import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissoesController } from './permissoes.controller';
import { PermissoesService } from './permissoes.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissoesController],
  providers: [PermissoesService],
})
export class PermissoesModule {}
