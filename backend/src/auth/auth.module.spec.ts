import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { MailModule } from '../common/services/mail.module';
import { MailService } from '../common/services/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from './auth.module';
import { RecoveryService } from './recovery.service';

const configuracao = {
  JWT_SECRET: 'segredo-de-teste',
  JWT_EXPIRES_IN: '1h',
  SMTP_HOST: 'smtp.example.invalid',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'usuario-smtp',
  SMTP_PASSWORD: 'senha-smtp',
  EMAIL_FROM: 'SGE <no-reply@example.invalid>',
  PUBLIC_APP_URL: 'https://app.example.invalid',
};

describe('AuthModule — composição de dependências', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ConfigService)
      .useValue(new ConfigService(configuracao))
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('compila sem conectar ao PostgreSQL ou ao SMTP', () => {
    expect(module).toBeDefined();
    expect(module.get(PrismaService)).toEqual({});
  });

  it('injeta AuditoriaService e MailService no RecoveryService', () => {
    const recovery = module.get(RecoveryService);
    const auditoria = module.get(AuditoriaService);
    const mail = module.get(MailService);

    const dependencias = recovery as unknown as {
      auditoriaService: AuditoriaService;
      mailService: MailService;
    };

    expect(recovery).toBeInstanceOf(RecoveryService);
    expect(dependencias.auditoriaService).toBe(auditoria);
    expect(dependencias.mailService).toBe(mail);
  });

  it('importa AuditoriaModule e MailModule sem duplicar MailService', () => {
    const imports = Reflect.getMetadata('imports', AuthModule) as unknown as
      | unknown[]
      | undefined;
    const providers = Reflect.getMetadata('providers', AuthModule) as
      | unknown[]
      | undefined;
    const exportsMailModule = Reflect.getMetadata('exports', MailModule) as
      | unknown[]
      | undefined;

    expect(imports).toContain(AuditoriaModule);
    expect(imports).toContain(MailModule);
    expect(providers).not.toContain(MailService);
    expect(exportsMailModule).toContain(MailService);
  });
});
