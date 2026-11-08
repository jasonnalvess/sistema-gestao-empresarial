import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST'),
        port: this.configService.get<number>('SMTP_PORT'),
        secure: this.configService.get<boolean>('SMTP_SECURE'),
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } catch (error) {
      this.logger.error('Erro ao configurar transporter SMTP', error);
    }
  }

  async sendEmail(options: nodemailer.SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail(options);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar e-mail para ${options.to}: ${error.message}`,
      );
      // Não lançamos erro para o cliente para evitar enumeração de usuários,
      // mas logamos internamente para diagnóstico.
      throw new InternalServerErrorException(
        'Falha ao enviar e-mail de recuperação',
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const sender = this.configService.get<string>('SMTP_FROM');

    const options: nodemailer.SendMailOptions = {
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #333;">Olá,</h2>
          <p>Você solicitou a recuperação de senha do sistema SGE.</p>
          <p>Para redefinir sua senha, clique no link abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/recuperar-senha#token=${token}"
               style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               Redefinir minha senha
            </a>
          </div>
          <p>Este link é válido por <strong>30 minutos</strong>.</p>
          <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
            Se você não solicitou esta recuperação, por favor ignore este e-mail. Sua senha atual permanece segura.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 0.8em; text-align: center;">
            Este é um e-mail automático, por favor não responda.
          </p>
        </div>
      `,
    };

    await this.sendEmail(options);
  }
}
