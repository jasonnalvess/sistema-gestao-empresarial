import { Prisma } from '@prisma/client';
import {
  AUDITORIA_CIRCULAR,
  AUDITORIA_REDACTED,
  prepararJsonAuditoria,
  sanitizarDadosAuditoria,
} from './auditoria-sanitizer';

describe('sanitizarDadosAuditoria', () => {
  it('sanitiza variações, capitalizações, objetos aninhados e arrays', () => {
    const entrada = {
      password: '1',
      SENHA: '2',
      passwordHash: '3',
      hash_senha: '4',
      accessToken: '5',
      refresh_token: '6',
      Authorization: '7',
      client_secret: '8',
      apiKey: '9',
      API_SECRET: '10',
      DATABASE_URL: '11',
      cookie: '12',
      'set-cookie': '13',
      aninhado: [{ token: '14', campoSeguro: 'preservado' }],
    };

    expect(sanitizarDadosAuditoria(entrada)).toEqual({
      password: AUDITORIA_REDACTED,
      SENHA: AUDITORIA_REDACTED,
      passwordHash: AUDITORIA_REDACTED,
      hash_senha: AUDITORIA_REDACTED,
      accessToken: AUDITORIA_REDACTED,
      refresh_token: AUDITORIA_REDACTED,
      Authorization: AUDITORIA_REDACTED,
      client_secret: AUDITORIA_REDACTED,
      apiKey: AUDITORIA_REDACTED,
      API_SECRET: AUDITORIA_REDACTED,
      DATABASE_URL: AUDITORIA_REDACTED,
      cookie: AUDITORIA_REDACTED,
      'set-cookie': AUDITORIA_REDACTED,
      aninhado: [{ token: AUDITORIA_REDACTED, campoSeguro: 'preservado' }],
    });
    expect(entrada.password).toBe('1');
    expect(entrada.aninhado[0].token).toBe('14');
  });

  it('sanitiza a senha temporária em todas as grafias e estruturas', () => {
    const segredos = [
      'Temp#1',
      'Temp#2',
      'Temp#3',
      'Temp#4',
      'Temp#5',
      'Temp#6',
      'Temp#7',
    ];
    const entrada = {
      senhaTemporaria: segredos[0],
      senha_temporaria: segredos[1],
      'senha-temporaria': segredos[2],
      SENHA_TEMPORARIA: segredos[3],
      SenhaTemporaria: segredos[4],
      usuario: {
        email: 'alvo@example.invalid',
        senhaTemporaria: segredos[5],
      },
      lista: [{ senha_temporaria: segredos[6], campoSeguro: 'preservado' }],
    };

    const resultado = sanitizarDadosAuditoria(entrada);

    expect(resultado).toEqual({
      senhaTemporaria: AUDITORIA_REDACTED,
      senha_temporaria: AUDITORIA_REDACTED,
      'senha-temporaria': AUDITORIA_REDACTED,
      SENHA_TEMPORARIA: AUDITORIA_REDACTED,
      SenhaTemporaria: AUDITORIA_REDACTED,
      usuario: {
        email: 'alvo@example.invalid',
        senhaTemporaria: AUDITORIA_REDACTED,
      },
      lista: [
        { senha_temporaria: AUDITORIA_REDACTED, campoSeguro: 'preservado' },
      ],
    });

    const serializado = JSON.stringify(resultado);
    for (const segredo of segredos) {
      expect(serializado).not.toContain(segredo);
    }
  });

  it('remove a senha temporária do JSON de auditoria', () => {
    const segredo = 'SenhaTemp#987654321';
    const resultado = prepararJsonAuditoria({
      senhaTemporaria: segredo,
      aninhado: { senha_temporaria: `${segredo}-aninhado` },
    });

    expect(resultado).toEqual({
      senhaTemporaria: AUDITORIA_REDACTED,
      aninhado: { senha_temporaria: AUDITORIA_REDACTED },
    });
    expect(JSON.stringify(resultado)).not.toContain(segredo);
  });

  it('preserva primitivos, null, undefined, Date e Decimal', () => {
    const data = new Date('2026-08-04T00:00:00.000Z');
    const decimal = new Prisma.Decimal('10.25');
    const entrada = {
      nulo: null,
      indefinido: undefined,
      numero: 1,
      data,
      decimal,
    };
    const resultado = sanitizarDadosAuditoria(entrada);
    expect(resultado).toEqual(entrada);
    expect((resultado as typeof entrada).data).toBe(data);
    expect((resultado as typeof entrada).decimal).toBe(decimal);
  });

  it('interrompe referências circulares sem mutar a origem', () => {
    const entrada: Record<string, unknown> = { nome: 'ciclo' };
    entrada.self = entrada;
    expect(sanitizarDadosAuditoria(entrada)).toEqual({
      nome: 'ciclo',
      self: AUDITORIA_CIRCULAR,
    });
    expect(entrada.self).toBe(entrada);
  });

  it('não serializa classes complexas arbitrariamente', () => {
    class Externo {
      constructor(readonly secretValue: string) {}
    }
    const externo = new Externo('preservado');
    expect(sanitizarDadosAuditoria(externo)).toBe(externo);
  });
});
