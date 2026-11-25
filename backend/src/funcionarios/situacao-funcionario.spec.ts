import { BadRequestException } from '@nestjs/common';
import { StatusFuncionario } from '@prisma/client';
import { planejarSituacao } from './situacao-funcionario';
import { AcaoAcessoFuncionario as Acao } from './dto/alterar-situacao.dto';

const agora = new Date('2026-09-07T12:00:00Z');
const admissao = new Date('2026-01-01');
const permitidas = new Set([
  'ATIVO:FERIAS',
  'ATIVO:AFASTADO',
  'ATIVO:LICENCA',
  'ATIVO:INATIVO',
  'ATIVO:DESLIGADO',
  'FERIAS:ATIVO',
  'FERIAS:DESLIGADO',
  'AFASTADO:ATIVO',
  'AFASTADO:DESLIGADO',
  'LICENCA:ATIVO',
  'LICENCA:DESLIGADO',
  'INATIVO:ATIVO',
  'INATIVO:DESLIGADO',
]);
describe('Máquina de estados de funcionário', () => {
  for (const origem of Object.values(StatusFuncionario)) {
    for (const status of Object.values(StatusFuncionario)) {
      it(`${origem} -> ${status}`, () => {
        const executar = () =>
          planejarSituacao(
            origem,
            admissao,
            undefined,
            {
              versaoRegistro: 0,
              status,
              ...(status === 'DESLIGADO'
                ? { dataDesligamento: '2026-09-07' }
                : {}),
            },
            agora,
          );
        if (permitidas.has(`${origem}:${status}`))
          expect(executar().acessoNovo).toBe('SEM_USUARIO');
        else expect(executar).toThrow(BadRequestException);
      });
    }
  }
  it.each([undefined, '2025-12-31', '2026-09-08', 'invalida'])(
    'rejeita desligamento com data %s',
    (dataDesligamento) => {
      expect(() =>
        planejarSituacao(
          'ATIVO',
          admissao,
          undefined,
          { versaoRegistro: 0, status: 'DESLIGADO', dataDesligamento },
          agora,
        ),
      ).toThrow(BadRequestException);
    },
  );
  it.each(['2026-09-07', '2026-09-07T23:59:59Z', '2026-09-08T01:00:00+03:00'])(
    'aceita o dia UTC atual sem comparar horário: %s',
    (dataDesligamento) => {
      expect(
        planejarSituacao(
          'ATIVO',
          admissao,
          undefined,
          { versaoRegistro: 0, status: 'DESLIGADO', dataDesligamento },
          agora,
        ).dataDesligamento,
      ).toBeInstanceOf(Date);
    },
  );
  it('rejeita data fora do desligamento', () => {
    expect(() =>
      planejarSituacao(
        'ATIVO',
        admissao,
        undefined,
        { versaoRegistro: 0, status: 'FERIAS', dataDesligamento: '2026-09-07' },
        agora,
      ),
    ).toThrow(BadRequestException);
  });
  it.each(['FERIAS', 'AFASTADO', 'LICENCA'] as const)(
    'exige decisão para %s com acesso ativo',
    (status) => {
      expect(() =>
        planejarSituacao(
          'ATIVO',
          admissao,
          true,
          { versaoRegistro: 0, status },
          agora,
        ),
      ).toThrow(BadRequestException);
      expect(
        planejarSituacao(
          'ATIVO',
          admissao,
          true,
          { versaoRegistro: 0, status, acaoAcesso: Acao.PRESERVAR },
          agora,
        ).suspender,
      ).toBe(false);
      expect(
        planejarSituacao(
          'ATIVO',
          admissao,
          true,
          { versaoRegistro: 0, status, acaoAcesso: Acao.SUSPENDER },
          agora,
        ).suspender,
      ).toBe(true);
    },
  );
  it.each([true, false, undefined])(
    'retorno ATIVO preserva acesso %s',
    (ativo) => {
      expect(
        planejarSituacao(
          'INATIVO',
          admissao,
          ativo,
          { versaoRegistro: 0, status: 'ATIVO' },
          agora,
        ).suspender,
      ).toBe(false);
      expect(() =>
        planejarSituacao(
          'INATIVO',
          admissao,
          ativo,
          { versaoRegistro: 0, status: 'ATIVO', acaoAcesso: Acao.SUSPENDER },
          agora,
        ),
      ).toThrow(BadRequestException);
    },
  );
  it('não permite suspender usuário inexistente', () => {
    expect(() =>
      planejarSituacao(
        'ATIVO',
        admissao,
        undefined,
        { versaoRegistro: 0, status: 'FERIAS', acaoAcesso: Acao.SUSPENDER },
        agora,
      ),
    ).toThrow(BadRequestException);
  });
});
