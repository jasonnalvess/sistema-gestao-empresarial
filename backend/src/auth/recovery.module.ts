import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MailModule } from '../common/services/mail.module';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';
import { PrismaModule } from '../prisma/prisma.module';
import { RecoveryService } from './recovery.service';

@Module({
  imports: [PrismaModule, MailModule, AuditoriaModule],
  providers: [RecoveryService, RateLimitService, IpUtil],
  exports: [RecoveryService, RateLimitService, IpUtil],
})
export class RecoveryModule {}
