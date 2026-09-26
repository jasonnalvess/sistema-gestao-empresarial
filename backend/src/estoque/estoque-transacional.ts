import {
  BadRequestException,
  ConflictException,
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
  empresaId: string,
  chaves: string[],
) {
  const prefixoTenant = `${empresaId}:`;
  const chavesOrdenadas = [...new Set(chaves)].sort();
  if (chavesOrdenadas.some((chave) => !chave.startsWith(prefixoTenant))) {
    throw new BadRequestException('Chave de estoque pertence a outra empresa');
  }
  for (const chave of chavesOrdenadas) {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${chave}, 0))`,
    );
  }
}

export async function validarProdutoEstoque(
  tx: Prisma.TransactionClient,
  empresaId: string,
  produtoId: string,
) {
  const produto = await tx.produto.findFirst({
    where: { id: produtoId, empresaId },
  });
  if (!produto) throw new NotFoundException('Produto não encontrado');
  if (!produto.ativo) {
    throw new BadRequestException(
      'Não é possível movimentar um produto inativo',
    );
  }
  return produto;
}

export async function validarDepositoEstoque(
  tx: Prisma.TransactionClient,
  empresaId: string,
  depositoId: string,
) {
  const deposito = await tx.deposito.findFirst({
    where: { id: depositoId, empresaId },
  });
  if (!deposito) throw new NotFoundException('Depósito não encontrado');
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
  const camposEsperados = ['empresaId', 'produtoId', 'depositoId'];
  return Array.isArray(target)
    ? target.length === camposEsperados.length &&
        camposEsperados.every((campo) => target.includes(campo))
    : target === 'EstoqueProduto_empresaId_produtoId_depositoId_key';
}

export function tratarP2002Estoque(error: unknown): never {
  if (isP2002Estoque(error)) {
    throw new ConflictException(
      'Já existe estoque para o produto neste depósito',
    );
  }
  throw error;
}
