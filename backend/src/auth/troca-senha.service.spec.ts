import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TrocaSenhaService } from './troca-senha.service';
jest.mock('bcrypt');
describe('TrocaSenhaService', () => {
  const ator = {
    id: 'ator',
    empresaId: 'empresa',
    email: 'fixture@example.invalid',
    tipo: 'USUARIO_EMPRESA',
    versaoAutorizacao: 0,
  };
  const dados = { senhaAtual: 'anterior', novaSenha: 'proxima' };
  const tx = {
    $queryRaw: jest.fn(),
    usuario: { findUnique: jest.fn(), update: jest.fn() },
    auditoriaLog: { create: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const service = new TrocaSenhaService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );
    tx.usuario.findUnique.mockResolvedValue({
      ...ator,
      ativo: true,
      senha: 'hash',
    });
    jest
      .mocked(bcrypt.compare)
      .mockResolvedValueOnce(true as never)
      .mockResolvedValueOnce(false as never);
    jest.mocked(bcrypt.hash).mockResolvedValue('novo-hash' as never);
  });
  it('incrementa uma vez e não expõe credenciais', async () => {
    await expect(service.trocar(ator, dados)).resolves.toEqual({
      novoLoginNecessario: true,
    });
    expect(tx.usuario.update).toHaveBeenCalledWith({
      where: { id: ator.id },
      data: {
        senha: 'novo-hash',
        trocaSenhaObrigatoria: false,
        versaoAutorizacao: { increment: 1 },
      },
      select: { id: true },
    });
    expect(JSON.stringify(tx.auditoriaLog.create.mock.calls)).not.toMatch(
      /anterior|proxima|novo-hash|senhaAtual|novaSenha/,
    );
  });
  it.each([
    { ativo: false },
    { versaoAutorizacao: 1 },
    { empresaId: 'outra' },
    { tipo: 'ADMIN_EMPRESA' },
  ])('rejeita sessão alterada %j', async (extra) => {
    tx.usuario.findUnique.mockResolvedValue({
      ...ator,
      ativo: true,
      senha: 'hash',
      ...extra,
    });
    await expect(service.trocar(ator, dados)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(tx.usuario.update).not.toHaveBeenCalled();
  });
  it.each(['P2034', '40001', '40P01'])(
    'retry %s não torna válida uma sessão antiga',
    async (code) => {
      const error = new Prisma.PrismaClientKnownRequestError('conflito', {
        clientVersion: '6',
        code: code === 'P2034' ? code : 'P2010',
        meta: { code },
      });
      prisma.$transaction.mockRejectedValueOnce(error);
      tx.usuario.findUnique.mockResolvedValue({
        ...ator,
        ativo: true,
        senha: 'hash',
        versaoAutorizacao: 1,
      });
      await expect(service.trocar(ator, dados)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(tx.usuario.update).not.toHaveBeenCalled();
    },
  );
  it('limita tentativas de serialização', async () => {
    prisma.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflito', {
        code: 'P2034',
        clientVersion: '6',
      }),
    );
    await expect(service.trocar(ator, dados)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });
});
