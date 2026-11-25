import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MailModule } from '../common/services/mail.module';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';
import { PrismaModule } from '../prisma/prisma.module';
import { CadastroPublicoController } from './cadastro-publico.controller';
import { CadastroPublicoService } from './cadastro-publico.service';

@Module({
  imports: [PrismaModule, MailModule, AuditoriaModule],
  controllers: [CadastroPublicoController],
  providers: [CadastroPublicoService, RateLimitService, IpUtil],
  exports: [CadastroPublicoService],
})
export class CadastroPublicoModule {}
