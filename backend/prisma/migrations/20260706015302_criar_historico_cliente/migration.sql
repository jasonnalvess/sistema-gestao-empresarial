-- CreateTable
CREATE TABLE "ClienteHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClienteHistorico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClienteHistorico" ADD CONSTRAINT "ClienteHistorico_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteHistorico" ADD CONSTRAINT "ClienteHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
