import { Request } from 'express';
import { IpUtil } from './ip.util';

function criarRequest(
  headers: Record<string, string | string[]>,
  remoteAddress?: string,
): Request {
  return {
    headers,
    socket: remoteAddress === undefined ? undefined : { remoteAddress },
  } as unknown as Request;
}

describe('IpUtil', () => {
  const util = new IpUtil();

  it.each([
    ['IPv4 válido', '203.0.113.10'],
    ['IPv6 completo', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
    ['IPv6 comprimido', '2001:db8::1'],
    ['IPv6 loopback comprimido', '::1'],
    ['IPv6 mapeado', '::ffff:203.0.113.10'],
  ])('aceita %s no cabeçalho validado', (_descricao, ip) => {
    const request = criarRequest({ 'x-sge-validated-ip': ip }, '127.0.0.1');

    expect(util.getRealIp(request)).toBe(ip);
  });

  it('remove espaços ao redor de um IP válido', () => {
    const request = criarRequest(
      { 'x-sge-validated-ip': '  203.0.113.10  ' },
      '127.0.0.1',
    );

    expect(util.getRealIp(request)).toBe('203.0.113.10');
  });

  it.each([
    ['IPv4 inválido', '256.0.0.1'],
    ['IPv6 inválido', '2001:db8:::1'],
    ['texto arbitrário', 'cliente-malicioso'],
    ['string vazia', ''],
    ['somente espaços', '   '],
  ])('rejeita %s e usa o fallback do socket', (_descricao, ip) => {
    const request = criarRequest({ 'x-sge-validated-ip': ip }, '127.0.0.1');

    expect(util.getRealIp(request)).toBe('127.0.0.1');
  });

  it('rejeita lista separada por vírgula e usa o fallback', () => {
    const request = criarRequest(
      { 'x-sge-validated-ip': '203.0.113.10, 198.51.100.1' },
      '127.0.0.1',
    );

    expect(util.getRealIp(request)).toBe('127.0.0.1');
  });

  it('rejeita array de cabeçalhos e usa o fallback', () => {
    const request = criarRequest(
      { 'x-sge-validated-ip': ['203.0.113.10', '198.51.100.1'] },
      '127.0.0.1',
    );

    expect(util.getRealIp(request)).toBe('127.0.0.1');
  });

  it('usa o fallback quando o cabeçalho está ausente', () => {
    const request = criarRequest({}, '198.51.100.20');

    expect(util.getRealIp(request)).toBe('198.51.100.20');
  });

  it('usa 0.0.0.0 quando não há cabeçalho nem socket', () => {
    const request = criarRequest({});

    expect(util.getRealIp(request)).toBe('0.0.0.0');
  });

  it('ignora cf-connecting-ip e x-forwarded-for não validados', () => {
    const request = criarRequest(
      {
        'cf-connecting-ip': '203.0.113.30',
        'x-forwarded-for': '198.51.100.31, 198.51.100.32',
      },
      '127.0.0.1',
    );

    expect(util.getRealIp(request)).toBe('127.0.0.1');
  });

  describe('getTrustedIp', () => {
    it.each([
      ['IPv4 válido', '203.0.113.10'],
      ['IPv6 completo', '2001:0db8:85a3:0000:0000:8a2e:0370:7334'],
      ['IPv6 comprimido', '2001:db8::1'],
    ])('aceita %s no cabeçalho validado', (_descricao, ip) => {
      const request = criarRequest({ 'x-sge-validated-ip': ip }, '127.0.0.1');

      expect(util.getTrustedIp(request)).toBe(ip);
    });

    it('remove espaços ao redor de um IP válido', () => {
      const request = criarRequest(
        { 'x-sge-validated-ip': '  203.0.113.10  ' },
        '127.0.0.1',
      );

      expect(util.getTrustedIp(request)).toBe('203.0.113.10');
    });

    it.each([
      ['IPv4 inválido', '256.0.0.1'],
      ['IPv6 inválido', '2001:db8:::1'],
      ['texto arbitrário', 'cliente-malicioso'],
      ['string vazia', ''],
      ['somente espaços', '   '],
      ['lista separada por vírgula', '203.0.113.10, 198.51.100.1'],
    ])('retorna null para %s sem usar o socket', (_descricao, ip) => {
      const request = criarRequest({ 'x-sge-validated-ip': ip }, '127.0.0.1');

      expect(util.getTrustedIp(request)).toBeNull();
    });

    it('retorna null para array de cabeçalhos', () => {
      const request = criarRequest(
        { 'x-sge-validated-ip': ['203.0.113.10', '198.51.100.1'] },
        '127.0.0.1',
      );

      expect(util.getTrustedIp(request)).toBeNull();
    });

    it('retorna null quando o cabeçalho está ausente, mesmo com socket', () => {
      const request = criarRequest({}, '198.51.100.20');

      expect(util.getTrustedIp(request)).toBeNull();
    });

    it('retorna null quando não há cabeçalho nem socket', () => {
      expect(util.getTrustedIp(criarRequest({}))).toBeNull();
    });

    it('ignora cf-connecting-ip e x-forwarded-for não validados', () => {
      const request = criarRequest(
        {
          'cf-connecting-ip': '203.0.113.30',
          'x-forwarded-for': '198.51.100.31, 198.51.100.32',
        },
        '127.0.0.1',
      );

      expect(util.getTrustedIp(request)).toBeNull();
    });

    it('coincide com getRealIp quando o cabeçalho é válido', () => {
      const request = criarRequest(
        { 'x-sge-validated-ip': ' 2001:db8::10 ' },
        '127.0.0.1',
      );

      expect(util.getTrustedIp(request)).toBe(util.getRealIp(request));
    });
  });
});
