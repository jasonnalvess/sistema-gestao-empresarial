import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FuncionariosService } from './funcionarios.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOVAS_PERMISSOES_RH,
  PERMISSOES_EXCLUIDAS_RH,
} from '../../prisma/seed/permissoes-rh';
import { PERMISSOES_EMPRESARIAIS_DELEGAVEIS } from '../perfis/permissoes-delegaveis';

describe('FuncionariosService — conflitos e contrato de permissões', () => {
  const ator = {
    id: 'ator',
    tipo: 'USUARIO_EMPRESA',
    empresaId: 'empresa',
    email: 'ator@example.invalid',
    versaoAutorizacao: 0,
    permissoes: ['funcionarios.criar'],
  };
  const dados = {
    nome: 'Maria',
    matricula: '001',
    dataAdmissao: '2026-01-01',
    tipoVinculo: 'CLT' as const,
  };
  it.each([
    ['P2034', undefined],
    ['P2010', '40001'],
    ['P2010', '40P01'],
  ])('limita retry em %s/%s a três tentativas', async (code, sqlCode) => {
    const prisma = {
      $transaction: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Conflito', {
          code,
          clientVersion: '6',
          meta: { code: sqlCode },
        }),
      ),
    };
    const service = new FuncionariosService(prisma as unknown as PrismaService);
    await expect(service.criar('empresa', ator, dados)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });
  it('não repete decisão funcional com revisão obsoleta', async () => {
    const erro = new ConflictException('Versão obsoleta');
    const prisma = { $transaction: jest.fn().mockRejectedValue(erro) };
    await expect(
      new FuncionariosService(prisma as unknown as PrismaService).editar(
        'empresa',
        ator,
        'id',
        { versaoRegistro: 0 },
      ),
    ).rejects.toBe(erro);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('preserva erros não transitórios', async () => {
    const erro = new Error('Falha de conexão');
    const prisma = { $transaction: jest.fn().mockRejectedValue(erro) };
    await expect(
      new FuncionariosService(prisma as unknown as PrismaService).criar(
        'empresa',
        ator,
        dados,
      ),
    ).rejects.toBe(erro);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('define cinco novas chaves e exclui acesso da delegação/perfil RH', () => {
    expect(NOVAS_PERMISSOES_RH.map((p) => p.chave).sort()).toEqual([
      'funcionarios.acesso.gerenciar',
      'funcionarios.dados_pessoais.editar',
      'funcionarios.dados_pessoais.visualizar',
      'funcionarios.estrutura.gerenciar',
      'funcionarios.situacao.gerenciar',
    ]);
    expect(PERMISSOES_EXCLUIDAS_RH).toContain('funcionarios.acesso.gerenciar');
    expect(
      PERMISSOES_EMPRESARIAIS_DELEGAVEIS.filter((p) =>
        p.startsWith('funcionarios.'),
      ),
    ).toHaveLength(8);
    expect(PERMISSOES_EMPRESARIAIS_DELEGAVEIS).not.toContain(
      'funcionarios.acesso.gerenciar',
    );
  });
});
