/*
  Warnings:

  - A unique constraint covering the columns `[empresaId,codigo]` on the table `Produto` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[empresaId,codigoBarras]` on the table `Produto` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Produto" ADD COLUMN     "altura" DECIMAL(65,30),
ADD COLUMN     "codigoBarras" TEXT,
ADD COLUMN     "comprimento" DECIMAL(65,30),
ADD COLUMN     "estoqueMaximo" DECIMAL(65,30),
ADD COLUMN     "estoqueMinimo" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "largura" DECIMAL(65,30),
ADD COLUMN     "marcaId" TEXT,
ADD COLUMN     "ncm" TEXT,
ADD COLUMN     "peso" DECIMAL(65,30),
ADD COLUMN     "precoCusto" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "unidadeMedidaId" TEXT;

-- CreateTable
CREATE TABLE "MarcaProduto" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarcaProduto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadeMedida" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadeMedida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarcaProduto_empresaId_nome_key" ON "MarcaProduto"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadeMedida_empresaId_sigla_key" ON "UnidadeMedida"("empresaId", "sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_empresaId_codigo_key" ON "Produto"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_empresaId_codigoBarras_key" ON "Produto"("empresaId", "codigoBarras");

-- AddForeignKey
ALTER TABLE "MarcaProduto" ADD CONSTRAINT "MarcaProduto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnidadeMedida" ADD CONSTRAINT "UnidadeMedida_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "MarcaProduto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_unidadeMedidaId_fkey" FOREIGN KEY ("unidadeMedidaId") REFERENCES "UnidadeMedida"("id") ON DELETE SET NULL ON UPDATE CASCADE;
