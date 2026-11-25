import { TrocaSenhaService } from './troca-senha.service';
import { RecoveryService } from './recovery.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { MailModule } from '../common/services/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RateLimitService } from '../common/services/rate-limit.service';
import { IpUtil } from '../common/utils/ip.util';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    UsuariosModule,
    AuditoriaModule,
    MailModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '1d') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TrocaSenhaService,
    RecoveryService,
    RateLimitService,
    IpUtil,
  ],
})
export class AuthModule {}
