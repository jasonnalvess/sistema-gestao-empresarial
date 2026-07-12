-- CreateEnum
CREATE TYPE "StatusPedidoCompra" AS ENUM ('RASCUNHO', 'PENDENTE_APROVACAO', 'APROVADO', 'PARCIALMENTE_RECEBIDO', 'RECEBIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusItemPedidoCompra" AS ENUM ('PENDENTE', 'PARCIALMENTE_RECEBIDO', 'RECEBIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "PedidoCompra" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "StatusPedidoCompra" NOT NULL DEFAULT 'RASCUNHO',
    "dataPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevistaEntrega" TIMESTAMP(3),
    "dataAprovacao" TIMESTAMP(3),
    "dataRecebimento" TIMESTAMP(3),
    "observacao" TEXT,
    "observacaoInterna" TEXT,
    "valorProdutos" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorFrete" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorOutros" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "empresaId" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "depositoId" TEXT NOT NULL,
    "usuarioCriacaoId" TEXT,
    "usuarioAprovacaoId" TEXT,
    "usuarioRecebimentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoCompraItem" (
    "id" TEXT NOT NULL,
    "quantidadeSolicitada" DECIMAL(65,30) NOT NULL,
    "quantidadeRecebida" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorUnitario" DECIMAL(65,30) NOT NULL,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(65,30) NOT NULL,
    "status" "StatusItemPedidoCompra" NOT NULL DEFAULT 'PENDENTE',
    "pedidoCompraId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoCompraHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pedidoCompraId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoCompraHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoCompra_empresaId_idx" ON "PedidoCompra"("empresaId");

-- CreateIndex
CREATE INDEX "PedidoCompra_fornecedorId_idx" ON "PedidoCompra"("fornecedorId");

-- CreateIndex
CREATE INDEX "PedidoCompra_depositoId_idx" ON "PedidoCompra"("depositoId");

-- CreateIndex
CREATE INDEX "PedidoCompra_status_idx" ON "PedidoCompra"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCompra_empresaId_numero_key" ON "PedidoCompra"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "PedidoCompraItem_produtoId_idx" ON "PedidoCompraItem"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCompraItem_pedidoCompraId_produtoId_key" ON "PedidoCompraItem"("pedidoCompraId", "produtoId");

-- CreateIndex
CREATE INDEX "PedidoCompraHistorico_pedidoCompraId_idx" ON "PedidoCompraHistorico"("pedidoCompraId");

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_usuarioCriacaoId_fkey" FOREIGN KEY ("usuarioCriacaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_usuarioAprovacaoId_fkey" FOREIGN KEY ("usuarioAprovacaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompra" ADD CONSTRAINT "PedidoCompra_usuarioRecebimentoId_fkey" FOREIGN KEY ("usuarioRecebimentoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompraItem" ADD CONSTRAINT "PedidoCompraItem_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "PedidoCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompraItem" ADD CONSTRAINT "PedidoCompraItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompraHistorico" ADD CONSTRAINT "PedidoCompraHistorico_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "PedidoCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCompraHistorico" ADD CONSTRAINT "PedidoCompraHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
