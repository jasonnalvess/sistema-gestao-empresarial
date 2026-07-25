-- CreateEnum
CREATE TYPE "StatusInventarioEstoque" AS ENUM ('ABERTO', 'EM_CONTAGEM', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusItemInventario" AS ENUM ('PENDENTE', 'CONTADO');

-- CreateTable
CREATE TABLE "InventarioEstoque" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "descricao" TEXT,
    "observacao" TEXT,
    "status" "StatusInventarioEstoque" NOT NULL DEFAULT 'ABERTO',
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataConclusao" TIMESTAMP(3),
    "empresaId" TEXT NOT NULL,
    "depositoId" TEXT NOT NULL,
    "usuarioAberturaId" TEXT,
    "usuarioConclusaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventarioEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioEstoqueItem" (
    "id" TEXT NOT NULL,
    "quantidadeSistema" DECIMAL(65,30) NOT NULL,
    "quantidadeContada" DECIMAL(65,30),
    "diferenca" DECIMAL(65,30),
    "observacao" TEXT,
    "status" "StatusItemInventario" NOT NULL DEFAULT 'PENDENTE',
    "inventarioId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventarioEstoqueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventarioEstoque_empresaId_numero_key" ON "InventarioEstoque"("empresaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "InventarioEstoqueItem_inventarioId_produtoId_key" ON "InventarioEstoqueItem"("inventarioId", "produtoId");

-- AddForeignKey
ALTER TABLE "InventarioEstoque" ADD CONSTRAINT "InventarioEstoque_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioEstoque" ADD CONSTRAINT "InventarioEstoque_depositoId_fkey" FOREIGN KEY ("depositoId") REFERENCES "Deposito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioEstoque" ADD CONSTRAINT "InventarioEstoque_usuarioAberturaId_fkey" FOREIGN KEY ("usuarioAberturaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioEstoque" ADD CONSTRAINT "InventarioEstoque_usuarioConclusaoId_fkey" FOREIGN KEY ("usuarioConclusaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioEstoqueItem" ADD CONSTRAINT "InventarioEstoqueItem_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "InventarioEstoque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioEstoqueItem" ADD CONSTRAINT "InventarioEstoqueItem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
