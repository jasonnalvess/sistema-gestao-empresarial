-- CreateEnum
CREATE TYPE "StatusVenda" AS ENUM ('RASCUNHO', 'PENDENTE', 'APROVADA', 'FATURADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusItemVenda" AS ENUM ('PENDENTE', 'SEPARADO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CondicaoPagamentoVenda" AS ENUM ('AVISTA', 'APRAZO');

-- CreateEnum
CREATE TYPE "FormaPagamentoVenda" AS ENUM ('DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CHEQUE', 'OUTRA');

-- AlterTable
ALTER TABLE "ContaReceber" ADD COLUMN     "vendaId" TEXT;

-- CreateTable
CREATE TABLE "Venda" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "status" "StatusVenda" NOT NULL DEFAULT 'RASCUNHO',
    "dataVenda" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAprovacao" TIMESTAMP(3),
    "dataFaturamento" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "dataCancelamento" TIMESTAMP(3),
    "observacao" TEXT,
    "observacaoInterna" TEXT,
    "condicaoPagamento" "CondicaoPagamentoVenda" NOT NULL DEFAULT 'AVISTA',
    "formaPagamento" "FormaPagamentoVenda",
    "quantidadeParcelas" INTEGER NOT NULL DEFAULT 1,
    "intervaloParcelas" INTEGER NOT NULL DEFAULT 30,
    "primeiroVencimento" TIMESTAMP(3),
    "valorProdutos" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorFrete" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorOutros" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "depositoId" TEXT NOT NULL,
    "usuarioCriacaoId" TEXT,
    "usuarioAprovacaoId" TEXT,
    "usuarioCancelamentoId" TEXT,
    "usuarioConclusaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendaItem" (
    "id" TEXT NOT NULL,
    "status" "StatusItemVenda" NOT NULL DEFAULT 'PENDENTE',
    "quantidade" DECIMAL(65,30) NOT NULL,
    "valorUnitario" DECIMAL(65,30) NOT NULL,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorTotal" DECIMAL(65,30) NOT NULL,
    "observacao" TEXT,
    "vendaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendaHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "vendaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendaHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Venda_empresaId_idx" ON "Venda"("empresaId");

-- CreateIndex
CREATE INDEX "Venda_clienteId_idx" ON "Venda"("clienteId");

-- CreateIndex
CREATE INDEX "Venda_depositoId_idx" ON "Venda"("depositoId");

-- CreateIndex
CREATE INDEX "Venda_status_idx" ON "Venda"("status");

-- CreateIndex
CREATE INDEX "Venda_dataVenda_idx" ON "Venda"("dataVenda");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_empresaId_numero_key" ON "Venda"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "VendaItem_vendaId_idx" ON "VendaItem"("vendaId");

-- CreateIndex
CREATE INDEX "VendaItem_produtoId_idx" ON "VendaItem"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "VendaItem_vendaId_produtoId_key" ON "VendaItem"("vendaId", "produtoId");

-- CreateIndex
CREATE INDEX "VendaHistorico_vendaId_idx" ON "VendaHistorico"("vendaId");

-- CreateIndex
CREATE INDEX "VendaHistorico_usuarioId_idx" ON "VendaHistorico"("usuarioId");

-- CreateIndex
CREATE INDEX "ContaReceber_vendaId_idx" ON "ContaReceber"("vendaId");

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_usuarioCriacaoId_fkey" FOREIGN KEY ("usuarioCriacaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_usuarioAprovacaoId_fkey" FOREIGN KEY ("usuarioAprovacaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_usuarioCancelamentoId_fkey" FOREIGN KEY ("usuarioCancelamentoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_usuarioConclusaoId_fkey" FOREIGN KEY ("usuarioConclusaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendaItem" ADD CONSTRAINT "VendaItem_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendaItem" ADD CONSTRAINT "VendaItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendaHistorico" ADD CONSTRAINT "VendaHistorico_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendaHistorico" ADD CONSTRAINT "VendaHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
