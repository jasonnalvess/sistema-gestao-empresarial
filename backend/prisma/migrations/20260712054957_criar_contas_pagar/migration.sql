-- CreateEnum
CREATE TYPE "StatusContaPagar" AS ENUM ('PENDENTE', 'PARCIALMENTE_PAGA', 'PAGA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigemContaPagar" AS ENUM ('MANUAL', 'PEDIDO_COMPRA', 'OUTRA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CHEQUE', 'OUTRA');

-- CreateTable
CREATE TABLE "ContaPagar" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "documento" TEXT,
    "observacao" TEXT,
    "origem" "OrigemContaPagar" NOT NULL DEFAULT 'MANUAL',
    "status" "StatusContaPagar" NOT NULL DEFAULT 'PENDENTE',
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCompetencia" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "dataCancelamento" TIMESTAMP(3),
    "parcelaAtual" INTEGER NOT NULL DEFAULT 1,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "valorOriginal" DECIMAL(65,30) NOT NULL,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorMulta" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorPago" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorAberto" DECIMAL(65,30) NOT NULL,
    "empresaId" TEXT NOT NULL,
    "fornecedorId" TEXT,
    "pedidoCompraId" TEXT,
    "usuarioCriacaoId" TEXT,
    "usuarioCancelamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagamentoContaPagar" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "desconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "juros" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "multa" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "formaPagamento" "FormaPagamento" NOT NULL,
    "dataPagamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documento" TEXT,
    "observacao" TEXT,
    "empresaId" TEXT NOT NULL,
    "contaPagarId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagamentoContaPagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaPagarHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "contaPagarId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaPagarHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContaPagar_empresaId_idx" ON "ContaPagar"("empresaId");

-- CreateIndex
CREATE INDEX "ContaPagar_fornecedorId_idx" ON "ContaPagar"("fornecedorId");

-- CreateIndex
CREATE INDEX "ContaPagar_pedidoCompraId_idx" ON "ContaPagar"("pedidoCompraId");

-- CreateIndex
CREATE INDEX "ContaPagar_status_idx" ON "ContaPagar"("status");

-- CreateIndex
CREATE INDEX "ContaPagar_dataVencimento_idx" ON "ContaPagar"("dataVencimento");

-- CreateIndex
CREATE UNIQUE INDEX "ContaPagar_empresaId_numero_key" ON "ContaPagar"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "PagamentoContaPagar_empresaId_idx" ON "PagamentoContaPagar"("empresaId");

-- CreateIndex
CREATE INDEX "PagamentoContaPagar_contaPagarId_idx" ON "PagamentoContaPagar"("contaPagarId");

-- CreateIndex
CREATE INDEX "PagamentoContaPagar_dataPagamento_idx" ON "PagamentoContaPagar"("dataPagamento");

-- CreateIndex
CREATE INDEX "ContaPagarHistorico_contaPagarId_idx" ON "ContaPagarHistorico"("contaPagarId");

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_pedidoCompraId_fkey" FOREIGN KEY ("pedidoCompraId") REFERENCES "PedidoCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_usuarioCriacaoId_fkey" FOREIGN KEY ("usuarioCriacaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagar" ADD CONSTRAINT "ContaPagar_usuarioCancelamentoId_fkey" FOREIGN KEY ("usuarioCancelamentoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoContaPagar" ADD CONSTRAINT "PagamentoContaPagar_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoContaPagar" ADD CONSTRAINT "PagamentoContaPagar_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagamentoContaPagar" ADD CONSTRAINT "PagamentoContaPagar_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagarHistorico" ADD CONSTRAINT "ContaPagarHistorico_contaPagarId_fkey" FOREIGN KEY ("contaPagarId") REFERENCES "ContaPagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaPagarHistorico" ADD CONSTRAINT "ContaPagarHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
