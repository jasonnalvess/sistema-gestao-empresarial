-- CreateTable
CREATE TABLE "OrdemServicoHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT,
    "ordemServicoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemServicoHistorico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrdemServicoHistorico" ADD CONSTRAINT "OrdemServicoHistorico_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemServicoHistorico" ADD CONSTRAINT "OrdemServicoHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
