-- CreateTable
CREATE TABLE "ProdutoHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProdutoHistorico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProdutoHistorico" ADD CONSTRAINT "ProdutoHistorico_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdutoHistorico" ADD CONSTRAINT "ProdutoHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
