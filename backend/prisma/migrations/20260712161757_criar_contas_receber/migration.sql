-- CreateEnum
CREATE TYPE "StatusContaReceber" AS ENUM ('PENDENTE', 'PARCIALMENTE_RECEBIDA', 'RECEBIDA', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigemContaReceber" AS ENUM ('MANUAL', 'ORDEM_SERVICO', 'VENDA', 'OUTRA');

-- CreateEnum
CREATE TYPE "FormaRecebimento" AS ENUM ('DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'CHEQUE', 'OUTRA');

-- CreateTable
CREATE TABLE "ContaReceber" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "documento" TEXT,
    "observacao" TEXT,
    "origem" "OrigemContaReceber" NOT NULL DEFAULT 'MANUAL',
    "status" "StatusContaReceber" NOT NULL DEFAULT 'PENDENTE',
    "dataEmissao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataCompetencia" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataRecebimento" TIMESTAMP(3),
    "dataCancelamento" TIMESTAMP(3),
    "parcelaAtual" INTEGER NOT NULL DEFAULT 1,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "valorOriginal" DECIMAL(65,30) NOT NULL,
    "valorDesconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorJuros" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorMulta" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorRecebido" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "valorAberto" DECIMAL(65,30) NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "ordemServicoId" TEXT,
    "usuarioCriacaoId" TEXT,
    "usuarioCancelamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecebimentoContaReceber" (
    "id" TEXT NOT NULL,
    "valor" DECIMAL(65,30) NOT NULL,
    "desconto" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "juros" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "multa" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "formaRecebimento" "FormaRecebimento" NOT NULL,
    "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documento" TEXT,
    "observacao" TEXT,
    "empresaId" TEXT NOT NULL,
    "contaReceberId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecebimentoContaReceber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaReceberHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "contaReceberId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaReceberHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContaReceber_empresaId_idx" ON "ContaReceber"("empresaId");

-- CreateIndex
CREATE INDEX "ContaReceber_clienteId_idx" ON "ContaReceber"("clienteId");

-- CreateIndex
CREATE INDEX "ContaReceber_ordemServicoId_idx" ON "ContaReceber"("ordemServicoId");

-- CreateIndex
CREATE INDEX "ContaReceber_status_idx" ON "ContaReceber"("status");

-- CreateIndex
CREATE INDEX "ContaReceber_dataVencimento_idx" ON "ContaReceber"("dataVencimento");

-- CreateIndex
CREATE UNIQUE INDEX "ContaReceber_empresaId_numero_key" ON "ContaReceber"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "RecebimentoContaReceber_empresaId_idx" ON "RecebimentoContaReceber"("empresaId");

-- CreateIndex
CREATE INDEX "RecebimentoContaReceber_contaReceberId_idx" ON "RecebimentoContaReceber"("contaReceberId");

-- CreateIndex
CREATE INDEX "RecebimentoContaReceber_dataRecebimento_idx" ON "RecebimentoContaReceber"("dataRecebimento");

-- CreateIndex
CREATE INDEX "ContaReceberHistorico_contaReceberId_idx" ON "ContaReceberHistorico"("contaReceberId");

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_usuarioCriacaoId_fkey" FOREIGN KEY ("usuarioCriacaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceber" ADD CONSTRAINT "ContaReceber_usuarioCancelamentoId_fkey" FOREIGN KEY ("usuarioCancelamentoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecebimentoContaReceber" ADD CONSTRAINT "RecebimentoContaReceber_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecebimentoContaReceber" ADD CONSTRAINT "RecebimentoContaReceber_contaReceberId_fkey" FOREIGN KEY ("contaReceberId") REFERENCES "ContaReceber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecebimentoContaReceber" ADD CONSTRAINT "RecebimentoContaReceber_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceberHistorico" ADD CONSTRAINT "ContaReceberHistorico_contaReceberId_fkey" FOREIGN KEY ("contaReceberId") REFERENCES "ContaReceber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaReceberHistorico" ADD CONSTRAINT "ContaReceberHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
