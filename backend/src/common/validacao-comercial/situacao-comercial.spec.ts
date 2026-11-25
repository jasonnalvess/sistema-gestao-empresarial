import {
  avaliarSituacaoComercial,
  calcularPeriodoComercial,
  comoIsoUtc,
  CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
  CODIGO_VALIDADE_COMERCIAL_INVALIDA,
  DIAS_VALIDADE_MAXIMO,
} from './situacao-comercial';

const INICIO = new Date('2026-01-10T00:00:00.000Z');
const FIM = new Date('2026-02-09T00:00:00.000Z');

describe('avaliarSituacaoComercial', () => {
  it.each([
    ['antes do início', new Date(INICIO.getTime() - 1), 'NAO_INICIADA'],
    [
      'um milissegundo antes do início',
      new Date(INICIO.getTime() - 1),
      'NAO_INICIADA',
    ],
  ])('bloqueia %s', (_cenario, agora, situacao) => {
    const avaliacao = avaliarSituacaoComercial(
      { validadeComercialInicio: INICIO, validadeComercialFim: FIM },
      agora,
    );

    expect(avaliacao).toEqual({
      situacao,
      bloqueada: true,
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
    });
  });

  it('considera vigente exatamente no início', () => {
    expect(
      avaliarSituacaoComercial(
        { validadeComercialInicio: INICIO, validadeComercialFim: FIM },
        INICIO,
      ),
    ).toEqual({
      situacao: 'VIGENTE',
      bloqueada: false,
      codigoBloqueio: null,
    });
  });

  it('considera vigente um milissegundo antes do fim', () => {
    expect(
      avaliarSituacaoComercial(
        { validadeComercialInicio: INICIO, validadeComercialFim: FIM },
        new Date(FIM.getTime() - 1),
      ),
    ).toEqual({
      situacao: 'VIGENTE',
      bloqueada: false,
      codigoBloqueio: null,
    });
  });

  it.each([
    ['exatamente no fim', FIM],
    ['depois do fim', new Date(FIM.getTime() + 1)],
  ])('bloqueia %s (intervalo [início, fim))', (_cenario, agora) => {
    expect(
      avaliarSituacaoComercial(
        { validadeComercialInicio: INICIO, validadeComercialFim: FIM },
        agora,
      ),
    ).toEqual({
      situacao: 'EXPIRADA',
      bloqueada: true,
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_EXPIRADA,
    });
  });

  it('trata empresa legada (ambos nulos) como sem validade limitada', () => {
    expect(
      avaliarSituacaoComercial({
        validadeComercialInicio: null,
        validadeComercialFim: null,
      }),
    ).toEqual({
      situacao: 'SEM_VALIDADE_LIMITADA',
      bloqueada: false,
      codigoBloqueio: null,
    });
  });

  it.each([
    ['apenas início', INICIO, null],
    ['apenas fim', null, FIM],
    ['fim igual ao início', INICIO, INICIO],
    ['fim anterior ao início', FIM, INICIO],
    ['data inválida no início', new Date(NaN), FIM],
    ['data inválida no fim', INICIO, new Date(NaN)],
  ])('fail-closed para dados inconsistentes: %s', (_cenario, inicio, fim) => {
    expect(
      avaliarSituacaoComercial(
        {
          validadeComercialInicio: inicio,
          validadeComercialFim: fim,
        },
        new Date('2026-01-20T00:00:00.000Z'),
      ),
    ).toEqual({
      situacao: 'INVALIDA',
      bloqueada: true,
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
    });
  });

  it('fail-closed quando o instante de referência é inválido', () => {
    expect(
      avaliarSituacaoComercial(
        { validadeComercialInicio: INICIO, validadeComercialFim: FIM },
        new Date(NaN),
      ),
    ).toMatchObject({
      situacao: 'INVALIDA',
      bloqueada: true,
      codigoBloqueio: CODIGO_VALIDADE_COMERCIAL_INVALIDA,
    });
  });

  it('é independente do timezone do processo (instantes UTC)', () => {
    const timezoneOriginal = process.env.TZ;
    const agora = new Date('2026-01-20T00:00:00.000Z');

    try {
      for (const timezone of [
        'UTC',
        'America/Sao_Paulo',
        'Asia/Tokyo',
        'Pacific/Kiritimati',
      ]) {
        process.env.TZ = timezone;

        // Mesmo instante expresso com deslocamentos distintos.
        expect(
          avaliarSituacaoComercial(
            {
              validadeComercialInicio: new Date(
                '2026-01-09T21:00:00.000-03:00',
              ),
              validadeComercialFim: new Date('2026-02-09T09:00:00.000+09:00'),
            },
            agora,
          ).situacao,
        ).toBe('VIGENTE');
      }
    } finally {
      process.env.TZ = timezoneOriginal;
    }
  });
});

describe('calcularPeriodoComercial', () => {
  const inicio = new Date('2026-03-01T12:00:00.000Z');

  it.each([1, 30, DIAS_VALIDADE_MAXIMO])(
    'gera janela exata de %s dias corridos em UTC',
    (dias) => {
      const periodo = calcularPeriodoComercial(inicio, dias);

      expect(periodo.validadeComercialInicio).toEqual(inicio);
      expect(periodo.validadeComercialFim!.getTime() - inicio.getTime()).toBe(
        dias * 24 * 60 * 60 * 1000,
      );
    },
  );

  it.each([0, -1, 1.5, DIAS_VALIDADE_MAXIMO + 1, NaN])(
    'recusa quantidade inválida de dias: %s',
    (dias) => {
      expect(() => calcularPeriodoComercial(inicio, dias)).toThrow(
        'Período comercial inválido.',
      );
    },
  );

  it('recusa instante inicial inválido', () => {
    expect(() => calcularPeriodoComercial(new Date(NaN), 30)).toThrow(
      'Período comercial inválido.',
    );
  });
});

describe('comoIsoUtc', () => {
  it('serializa datas em ISO UTC e preserva nulos', () => {
    expect(comoIsoUtc(new Date('2026-01-10T00:00:00.000Z'))).toBe(
      '2026-01-10T00:00:00.000Z',
    );
    expect(comoIsoUtc(null)).toBeNull();
    expect(comoIsoUtc(undefined)).toBeNull();
    expect(comoIsoUtc(new Date(NaN))).toBeNull();
  });
});
