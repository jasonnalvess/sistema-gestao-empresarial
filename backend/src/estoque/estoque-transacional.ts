import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function chaveLockEstoque(
  empresaId: string,
  produtoId: string,
  depositoId: string,
) {
  return `${empresaId}:${produtoId}:${depositoId}`;
}

export async function bloquearEstoques(
  tx: Prisma.TransactionClient,
  chaves: string[],
) {
  for (const chave of [...new Set(chaves)].sort()) {
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))
    `;
  }
}

export async function validarProdutoEstoque(
  tx: Prisma.TransactionClient,
  produtoId: string,
  empresaId: string,
) {
  const produto = await tx.produto.findUnique({ where: { id: produtoId } });
  if (!produto) throw new NotFoundException('Produto não encontrado');
  if (produto.empresaId !== empresaId) {
    throw new ForbiddenException('Produto pertence a outra empresa');
  }
  if (!produto.ativo) {
    throw new BadRequestException(
      'Não é possível movimentar um produto inativo',
    );
  }
  return produto;
}

export async function validarDepositoEstoque(
  tx: Prisma.TransactionClient,
  depositoId: string,
  empresaId: string,
) {
  const deposito = await tx.deposito.findUnique({ where: { id: depositoId } });
  if (!deposito) throw new NotFoundException('Depósito não encontrado');
  if (deposito.empresaId !== empresaId) {
    throw new ForbiddenException('Depósito pertence a outra empresa');
  }
  if (!deposito.ativo) {
    throw new BadRequestException(
      'Não é possível movimentar um depósito inativo',
    );
  }
  return deposito;
}

export function isP2002Estoque(error: unknown) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  )
    return false;
  const target = error.meta?.target;
  return Array.isArray(target)
    ? ['empresaId', 'produtoId', 'depositoId'].every((campo) =>
        target.includes(campo),
      )
    : typeof target === 'string' &&
        target.includes('EstoqueProduto_empresaId_produtoId_depositoId_key');
}

export function tratarP2002Estoque(error: unknown): never {
  if (isP2002Estoque(error)) {
    throw new ConflictException(
      'Já existe estoque para o produto neste depósito',
    );
  }
  throw error;
}
