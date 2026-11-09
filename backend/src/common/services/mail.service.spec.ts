import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SendMailOptions } from 'nodemailer/lib/mailer';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const destinatario = 'destinatario@example.invalid';
const token = 'token-bruto-de-recuperacao';
const hash = 'hash-do-token-nao-deve-aparecer';

const configuracaoBase: Record<string, string | undefined> = {
  SMTP_HOST: 'smtp.example.invalid',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'usuario-smtp',
  SMTP_PASSWORD: 'senha-smtp',
  EMAIL_FROM: 'SGE <no-reply@example.invalid>',
  PUBLIC_APP_URL: 'https://app.example.invalid',
};

function criarConfigService(
  valores: Record<string, string | undefined>,
): ConfigService {
  return {
    get: jest.fn((chave: string) => valores[chave]),
  } as unknown as ConfigService;
}

function criarServico(
  valores: Record<string, string | undefined> = configuracaoBase,
): MailService {
  return new MailService(criarConfigService(valores));
}

describe('MailService', () => {
  let criarTransporte: jest.MockedFunction<typeof nodemailer.createTransport>;
  let sendMail: jest.Mock<Promise<void>, [SendMailOptions]>;
  let logError: jest.SpyInstance;

  beforeEach(() => {
    sendMail = jest.fn<Promise<void>, [SendMailOptions]>();
    sendMail.mockResolvedValue(undefined);

    criarTransporte = jest.mocked(nodemailer.createTransport);
    criarTransporte.mockReset();
    criarTransporte.mockReturnValue({
      sendMail,
    } as unknown as nodemailer.Transporter);

    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logError.mockRestore();
  });

  function obterMensagemEnviada(): SendMailOptions {
    expect(sendMail).toHaveBeenCalledTimes(1);
    return sendMail.mock.calls[0][0];
  }

  it('constrói a mensagem com destinatário, remetente, assunto, URL e token', async () => {
    await criarServico().sendPasswordResetEmail(destinatario, token);

    const mensagem = obterMensagemEnviada();
    const link = `${configuracaoBase.PUBLIC_APP_URL}/recuperar-senha#token=${token}`;

    expect(mensagem.to).toBe(destinatario);
    expect(mensagem.from).toBe(configuracaoBase.EMAIL_FROM);
    expect(mensagem.subject).toBe('Recuperação de senha — SGE');
    expect(mensagem.text).toContain(link);
    expect(mensagem.html).toContain(`href="${link}"`);
    expect(mensagem.html).toContain(token);
    expect(mensagem.text).toContain('30 minutos');
    expect(mensagem.html).toContain('30 minutos');
  });

  it('normaliza PUBLIC_APP_URL com barra final sem duplicar a barra do link', async () => {
    await criarServico({
      ...configuracaoBase,
      PUBLIC_APP_URL: 'https://app.example.invalid/',
    }).sendPasswordResetEmail(destinatario, token);

    const mensagem = obterMensagemEnviada();

    expect(mensagem.html).toContain(
      'https://app.example.invalid/recuperar-senha#token=',
    );
    expect(mensagem.html).not.toContain('https://app.example.invalid//');
  });

  it('cria o transporter com os nomes consolidados de configuração', async () => {
    await criarServico().sendPasswordResetEmail(destinatario, token);

    expect(criarTransporte).toHaveBeenCalledTimes(1);
    expect(criarTransporte).toHaveBeenCalledWith({
      host: 'smtp.example.invalid',
      port: 587,
      secure: false,
      auth: {
        user: 'usuario-smtp',
        pass: 'senha-smtp',
      },
    });
  });

  it('interpreta SMTP_SECURE como booleano e reutiliza o transporter', async () => {
    const servico = criarServico({
      ...configuracaoBase,
      SMTP_SECURE: 'true',
    });

    await servico.sendPasswordResetEmail(destinatario, token);
    await servico.sendPasswordResetEmail(destinatario, token);

    expect(criarTransporte).toHaveBeenCalledTimes(1);
    expect(criarTransporte).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('propaga falha de envio como erro operacional', async () => {
    sendMail.mockRejectedValue(
      Object.assign(new Error('falha simulada'), { code: 'EAUTH' }),
    );

    await expect(
      criarServico().sendPasswordResetEmail(destinatario, token),
    ).rejects.toBeInstanceOf(InternalServerErrorException);

    await expect(
      criarServico().sendPasswordResetEmail(destinatario, token),
    ).rejects.toThrow('Falha ao enviar e-mail de recuperação');
  });

  it('não registra token bruto, hash ou senha SMTP nos logs', async () => {
    sendMail.mockRejectedValueOnce(
      Object.assign(new Error(`${token} ${hash}`), { code: 'EAUTH' }),
    );

    await expect(
      criarServico().sendPasswordResetEmail(destinatario, token),
    ).rejects.toThrow();

    const registros = JSON.stringify(logError.mock.calls);

    expect(registros).toContain('EAUTH');
    expect(registros).not.toContain(token);
    expect(registros).not.toContain(hash);
    expect(registros).not.toContain(configuracaoBase.SMTP_PASSWORD);
  });

  it('não registra erro quando o envio é bem-sucedido', async () => {
    await criarServico().sendPasswordResetEmail(destinatario, token);

    expect(logError).not.toHaveBeenCalled();
  });

  it('não cria transporter no construtor e não falha com configuração ausente', () => {
    expect(() => new MailService(criarConfigService({}))).not.toThrow();
    expect(criarTransporte).not.toHaveBeenCalled();
  });

  it.each(['SMTP_HOST', 'SMTP_PORT', 'EMAIL_FROM', 'PUBLIC_APP_URL'])(
    'rejeita configuração obrigatória ausente: %s',
    async (chave) => {
      const configuracao = { ...configuracaoBase };
      delete configuracao[chave];

      await expect(
        criarServico(configuracao).sendPasswordResetEmail(destinatario, token),
      ).rejects.toThrow(`Configuração de e-mail ausente: ${chave}.`);

      expect(criarTransporte).not.toHaveBeenCalled();
    },
  );

  it('rejeita SMTP_PORT inválida antes de criar o transporter', async () => {
    await expect(
      criarServico({
        ...configuracaoBase,
        SMTP_PORT: 'porta-invalida',
      }).sendPasswordResetEmail(destinatario, token),
    ).rejects.toThrow('Configuração de e-mail inválida: SMTP_PORT.');

    expect(criarTransporte).not.toHaveBeenCalled();
  });

  it('rejeita PUBLIC_APP_URL que não seja http ou https', async () => {
    await expect(
      criarServico({
        ...configuracaoBase,
        PUBLIC_APP_URL: 'ftp://app.example.invalid',
      }).sendPasswordResetEmail(destinatario, token),
    ).rejects.toThrow('Configuração de e-mail inválida: PUBLIC_APP_URL.');

    expect(criarTransporte).not.toHaveBeenCalled();
  });

  it('rejeita autenticação SMTP parcial', async () => {
    const configuracao = { ...configuracaoBase };
    delete configuracao.SMTP_PASSWORD;

    await expect(
      criarServico(configuracao).sendPasswordResetEmail(destinatario, token),
    ).rejects.toThrow('SMTP_USER e SMTP_PASSWORD devem ser informados juntos.');

    expect(criarTransporte).not.toHaveBeenCalled();
  });

  it('rejeita destinatário vazio', async () => {
    await expect(
      criarServico().sendPasswordResetEmail('   ', token),
    ).rejects.toThrow('Destinatário de e-mail ausente.');

    expect(sendMail).not.toHaveBeenCalled();
  });

  it('rejeita token vazio sem registrar o valor', async () => {
    await expect(
      criarServico().sendPasswordResetEmail(destinatario, ''),
    ).rejects.toThrow('Token de recuperação de senha ausente.');

    expect(sendMail).not.toHaveBeenCalled();
  });
});
