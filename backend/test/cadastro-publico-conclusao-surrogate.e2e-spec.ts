import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { CadastroPublicoController } from '../src/cadastro-publico/cadastro-publico.controller';
import {
  CadastroPublicoService,
  ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO,
  LIMITE_CONCLUSAO_CADASTRO,
} from '../src/cadastro-publico/cadastro-publico.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RespostaInterceptor } from '../src/common/interceptors/resposta.interceptor';
import { RateLimitService } from '../src/common/services/rate-limit.service';
import { IpUtil } from '../src/common/utils/ip.util';

/**
 * V3.6.5 / E3 — prova HTTP da correção do limite bcrypt UTF-8.
 *
 * O spec do DTO valida a constraint em isolamento. Este E2E fecha a lacuna
 * restante: sobe a aplicação NestJS, aplica exatamente o `ValidationPipe` de
 * `src/main.ts` e envia a requisição HTTP real, comprovando que uma senha com
 * surrogate UTF-16 isolado produz 400 — e nunca 500.
 *
 * Isolamento: nenhuma dependência de banco é instanciada. `PrismaService` não
 * participa do módulo de teste, logo é impossível haver leitura ou escrita em
 * PostgreSQL. `CadastroPublicoService` e `RateLimitService` são mocks: qualquer
 * chamada a eles — rate limit ou operações de onboarding — falharia as
 * asserções, porque os pipes rodam antes do handler do controller.
 */
const ROTA_CONCLUSAO = '/cadastro-publico/solicitacoes/conclusao';
const IP_VALIDADO = '203.0.113.10';
const TOKEN_VALIDO = 'a'.repeat(64);

const MENSAGEM_SENHA_BYTES = 'A senha deve ter no máximo 72 bytes (UTF-8)';
const MENSAGEM_CONFIRMACAO_BYTES =
  'A confirmação da senha deve ter no máximo 72 bytes (UTF-8)';

/**
 * Escape JSON do surrogate isolado: é exatamente este texto (`\uD800` com
 * barra invertida literal) que trafega no corpo. O servidor o converte em um
 * code unit U+D800 órfão ao fazer `JSON.parse`.
 */
const SENHA_COM_ESCAPE_SURROGATE = 'senha123\\uD800';

const cadastroPublicoServiceMock = {
  solicitar: jest.fn(),
  concluir: jest.fn(),
  reenviar: jest.fn(),
};

const rateLimitServiceMock = {
  checkLimit: jest.fn(),
};

const resultadoConclusao = {
  message: 'Cadastro concluído com sucesso.',
  empresaId: '11111111-1111-4111-8111-111111111111',
  usuarioId: '22222222-2222-4222-8222-222222222222',
};

describe('Conclusão do cadastro público — surrogate UTF-16 isolado (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CadastroPublicoController],
      providers: [
        IpUtil,
        {
          provide: CadastroPublicoService,
          useValue: cadastroPublicoServiceMock,
        },
        {
          provide: RateLimitService,
          useValue: rateLimitServiceMock,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: RespostaInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Cópia literal da configuração de `src/main.ts`. Não é substituída por
    // validação simulada: o DTO real é validado pelo `class-validator`.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cadastroPublicoServiceMock.concluir.mockResolvedValue(resultadoConclusao);
  });

  afterAll(async () => {
    await app.close();
  });

  const corpoJsonCru = (senhaComEscape: string): string =>
    `{"token":"${TOKEN_VALIDO}","senha":"${senhaComEscape}","confirmarSenha":"${senhaComEscape}"}`;

  /**
   * Envia o corpo como string: o superagent só serializa quando o dado não é
   * string, então a escape `\uD800` chega intacta ao body parser.
   */
  const postarCorpoCru = (corpo: string) =>
    request(app.getHttpServer())
      .post(ROTA_CONCLUSAO)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .type('json')
      .send(corpo);

  it('envia \\uD800 no corpo e JSON.parse produz surrogate isolado de 9 caracteres', () => {
    expect(SENHA_COM_ESCAPE_SURROGATE).toContain('\\uD800');
    expect(SENHA_COM_ESCAPE_SURROGATE).toHaveLength(14);

    const senhaInterpretada = JSON.parse(
      `"${SENHA_COM_ESCAPE_SURROGATE}"`,
    ) as string;

    expect(senhaInterpretada).toHaveLength(9);
    expect(senhaInterpretada.startsWith('senha123')).toBe(true);
    expect(senhaInterpretada.charCodeAt(8)).toBe(0xd800);
    // 11 bytes: muito abaixo dos 72 do bcrypt, logo a única regra que pode
    // reprovar o payload é a checagem de surrogate isolado.
    expect(Buffer.byteLength(senhaInterpretada, 'utf8')).toBe(11);
  });

  it('responde 400 — nunca 500 — sem chamar o serviço nem o rate limit', async () => {
    const resposta = await postarCorpoCru(
      corpoJsonCru(SENHA_COM_ESCAPE_SURROGATE),
    );

    expect(resposta.status).toBe(400);
    expect(resposta.status).not.toBe(500);
    expect(resposta.headers['content-type']).toContain('application/json');

    const corpo = resposta.body as {
      success?: unknown;
      statusCode?: unknown;
      path?: unknown;
      message?: unknown;
    };

    expect(corpo.success).toBe(false);
    expect(corpo.statusCode).toBe(400);
    expect(corpo.path).toBe(ROTA_CONCLUSAO);

    const mensagens = corpo.message as string[];
    expect(mensagens).toHaveLength(2);
    expect(mensagens).toEqual(
      expect.arrayContaining([
        MENSAGEM_SENHA_BYTES,
        MENSAGEM_CONFIRMACAO_BYTES,
      ]),
    );

    // O serviço de conclusão (e portanto todo o onboarding: empresa, usuário,
    // perfil, módulos, trial, auditoria e consumo do token) não foi acionado.
    expect(cadastroPublicoServiceMock.concluir).not.toHaveBeenCalled();
    expect(cadastroPublicoServiceMock.solicitar).not.toHaveBeenCalled();
    expect(cadastroPublicoServiceMock.reenviar).not.toHaveBeenCalled();

    // O rate limit também não roda: os pipes executam antes do handler. Ou
    // seja, nenhuma escrita em `RateLimit` seria possível por este caminho.
    expect(rateLimitServiceMock.checkLimit).not.toHaveBeenCalled();
  });

  it('responde 400 também para low surrogate isolado', async () => {
    const resposta = await postarCorpoCru(corpoJsonCru('senha123\\uDC00'));

    expect(resposta.status).toBe(400);
    expect(resposta.status).not.toBe(500);

    const corpo = resposta.body as { message?: unknown };
    expect(corpo.message).toEqual(
      expect.arrayContaining([
        MENSAGEM_SENHA_BYTES,
        MENSAGEM_CONFIRMACAO_BYTES,
      ]),
    );

    expect(cadastroPublicoServiceMock.concluir).not.toHaveBeenCalled();
    expect(rateLimitServiceMock.checkLimit).not.toHaveBeenCalled();
  });

  it('controle: a mesma senha sem o surrogate alcança o serviço (201)', async () => {
    const resposta = await request(app.getHttpServer())
      .post(ROTA_CONCLUSAO)
      .set('x-sge-validated-ip', IP_VALIDADO)
      .type('json')
      .send({
        token: TOKEN_VALIDO,
        senha: 'senha1234',
        confirmarSenha: 'senha1234',
      });

    // Mesmo tamanho (9 caracteres) e mesma rota: só o surrogate difere.
    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ success: true, data: resultadoConclusao });

    expect(cadastroPublicoServiceMock.concluir).toHaveBeenCalledTimes(1);
    expect(cadastroPublicoServiceMock.concluir).toHaveBeenCalledWith(
      expect.objectContaining({
        token: TOKEN_VALIDO,
        senha: 'senha1234',
        confirmarSenha: 'senha1234',
      }),
      IP_VALIDADO,
    );

    expect(rateLimitServiceMock.checkLimit).toHaveBeenCalledWith(
      expect.anything(),
      ENDPOINT_RATE_LIMIT_CONCLUSAO_CADASTRO,
      LIMITE_CONCLUSAO_CADASTRO,
    );
  });
});
