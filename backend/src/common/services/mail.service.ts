import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer/lib/mailer';

interface ConfiguracaoSmtp {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(
    options: nodemailer.SendMailOptions,
    contexto = 'recuperação',
  ): Promise<void> {
    const transporter = this.obterTransporter();

    try {
      await transporter.sendMail(options);
    } catch (error) {
      const codigo = this.obterCodigoErro(error);
      this.logger.error(
        `Erro ao enviar e-mail de ${contexto}${codigo ? ` (${codigo})` : ''}.`,
      );
      throw new InternalServerErrorException(
        `Falha ao enviar e-mail de ${contexto}`,
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const publicAppUrl = this.obterUrlPublica();
    const remetente = this.obterRemetente();
    const destinatario = email?.trim();

    if (!destinatario) {
      throw new InternalServerErrorException('Destinatário de e-mail ausente.');
    }

    if (!token) {
      throw new InternalServerErrorException(
        'Token de recuperação de senha ausente.',
      );
    }

    const link = `${publicAppUrl}/recuperar-senha#token=${encodeURIComponent(token)}`;
    const assunto = 'Recuperação de senha — SGE';

    const options: SendMailOptions = {
      to: destinatario,
      from: remetente,
      subject: assunto,
      text: [
        'Olá,',
        '',
        'Você solicitou a recuperação de senha do sistema SGE.',
        '',
        `Para redefinir sua senha, acesse: ${link}`,
        '',
        'Este link é válido por 30 minutos.',
        'Se você não solicitou esta recuperação, ignore este e-mail. Sua senha atual permanece segura.',
        '',
        'Este é um e-mail automático, por favor não responda.',
      ].join('\n'),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #333;">Olá,</h2>
          <p>Você solicitou a recuperação de senha do sistema SGE.</p>
          <p>Para redefinir sua senha, clique no link abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}"
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

  /**
   * E-mail de verificação do cadastro público (V3.6.5, Fase A).
   * O token bruto chega por parâmetro e nunca é logado nem persistido aqui;
   * o link usa o mesmo PUBLIC_APP_URL da recuperação de senha.
   */
  async enviarEmailVerificacaoCadastro(dados: {
    destinatario: string;
    nomeResponsavel: string;
    nomeEmpresa: string;
    token: string;
  }): Promise<void> {
    const publicAppUrl = this.obterUrlPublica();
    const remetente = this.obterRemetente();
    const destinatario = dados.destinatario?.trim();

    if (!destinatario) {
      throw new InternalServerErrorException('Destinatário de e-mail ausente.');
    }

    if (!dados.token) {
      throw new InternalServerErrorException(
        'Token de verificação de cadastro ausente.',
      );
    }

    const link = `${publicAppUrl}/cadastro/verificar?token=${encodeURIComponent(dados.token)}`;
    const assunto = 'Confirmação de cadastro — SGE';
    const nomeResponsavel = this.escaparHtml(
      dados.nomeResponsavel?.trim() || 'cliente',
    );
    const nomeEmpresa = this.escaparHtml(
      dados.nomeEmpresa?.trim() || 'sua empresa',
    );

    const options: SendMailOptions = {
      to: destinatario,
      from: remetente,
      subject: assunto,
      text: [
        `Olá, ${nomeResponsavel}.`,
        '',
        `Recebemos uma solicitação de cadastro da empresa ${nomeEmpresa} no SGE.`,
        '',
        `Para confirmar o e-mail e continuar o cadastro, acesse: ${link}`,
        '',
        'Este link é válido por 24 horas e pode ser utilizado apenas uma vez.',
        'Se você não fez esta solicitação, ignore este e-mail. Nenhuma conta será criada.',
        '',
        'Este é um e-mail automático, por favor não responda.',
      ].join('\n'),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #333;">Olá, ${nomeResponsavel}.</h2>
          <p>Recebemos uma solicitação de cadastro da empresa <strong>${nomeEmpresa}</strong> no SGE.</p>
          <p>Para confirmar o e-mail e continuar o cadastro, clique no link abaixo:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}"
               style="background-color: #2563eb; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               Confirmar e-mail e continuar
            </a>
          </div>
          <p>Este link é válido por <strong>24 horas</strong> e pode ser utilizado apenas uma vez.</p>
          <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
            Se você não fez esta solicitação, por favor ignore este e-mail. Nenhuma conta será criada.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 0.8em; text-align: center;">
            Este é um e-mail automático, por favor não responda.
          </p>
        </div>
      `,
    };

    await this.sendEmail(options, 'verificação de cadastro');
  }

  private escaparHtml(valor: string): string {
    return valor
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private obterTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport(
        this.obterConfiguracaoSmtp(),
      );
    }

    return this.transporter;
  }

  private obterConfiguracaoSmtp(): ConfiguracaoSmtp {
    const host = this.obterConfiguracaoObrigatoria('SMTP_HOST');
    const port = this.obterPorta();
    const secure = this.obterBooleano('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER')?.trim();
    const pass = this.configService.get<string>('SMTP_PASSWORD')?.trim();

    if (Boolean(user) !== Boolean(pass)) {
      throw new InternalServerErrorException(
        'Configuração SMTP incompleta: SMTP_USER e SMTP_PASSWORD devem ser informados juntos.',
      );
    }

    return {
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    };
  }

  private obterConfiguracaoObrigatoria(nome: string): string {
    const valor = this.configService.get<string>(nome)?.trim();

    if (!valor) {
      throw new InternalServerErrorException(
        `Configuração de e-mail ausente: ${nome}.`,
      );
    }

    return valor;
  }

  private obterPorta(): number {
    const valor = this.obterConfiguracaoObrigatoria('SMTP_PORT');
    const porta = Number(valor);

    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
      throw new InternalServerErrorException(
        'Configuração de e-mail inválida: SMTP_PORT.',
      );
    }

    return porta;
  }

  private obterBooleano(nome: string, valorPadrao: boolean): boolean {
    const valor = this.configService.get<unknown>(nome);

    if (valor === undefined || valor === null || valor === '') {
      return valorPadrao;
    }

    if (
      typeof valor !== 'string' &&
      typeof valor !== 'number' &&
      typeof valor !== 'boolean'
    ) {
      throw new InternalServerErrorException(
        `Configuração de e-mail inválida: ${nome}.`,
      );
    }

    const normalizado = String(valor).trim().toLowerCase();

    if (['true', '1', 'yes', 'sim'].includes(normalizado)) {
      return true;
    }

    if (['false', '0', 'no', 'nao', 'não'].includes(normalizado)) {
      return false;
    }

    throw new InternalServerErrorException(
      `Configuração de e-mail inválida: ${nome}.`,
    );
  }

  private obterUrlPublica(): string {
    const valor = this.obterConfiguracaoObrigatoria('PUBLIC_APP_URL');

    try {
      const url = new URL(valor);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Protocolo inválido.');
      }
    } catch {
      throw new InternalServerErrorException(
        'Configuração de e-mail inválida: PUBLIC_APP_URL.',
      );
    }

    return valor.replace(/\/+$/, '');
  }

  private obterRemetente(): string {
    return this.obterConfiguracaoObrigatoria('EMAIL_FROM');
  }

  private obterCodigoErro(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return undefined;
    }

    const codigo = (error as { code?: unknown }).code;

    return typeof codigo === 'string' ? codigo : undefined;
  }
}
