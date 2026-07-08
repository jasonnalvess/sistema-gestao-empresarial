-- CreateTable
CREATE TABLE "EstoqueProduto" (
    "id" TEXT NOT NULL,
    "quantidadeAtual" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estoqueMinimo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estoqueMaximo" DECIMAL(65,30),
    "empresaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueProduto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueProduto_produtoId_key" ON "EstoqueProduto"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueProduto_empresaId_produtoId_key" ON "EstoqueProduto"("empresaId", "produtoId");

-- AddForeignKey
ALTER TABLE "EstoqueProduto" ADD CONSTRAINT "EstoqueProduto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstoqueProduto" ADD CONSTRAINT "EstoqueProduto_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
