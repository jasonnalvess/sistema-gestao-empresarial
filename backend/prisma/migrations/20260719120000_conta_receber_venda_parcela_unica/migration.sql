-- CreateIndex
CREATE UNIQUE INDEX "ContaReceber_vendaId_parcelaAtual_key" ON "ContaReceber"("vendaId", "parcelaAtual");

-- DropIndex
DROP INDEX "ContaReceber_vendaId_idx";
