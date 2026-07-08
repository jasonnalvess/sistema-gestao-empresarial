-- CreateTable
CREATE TABLE "AgendaEventoHistorico" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "agendaEventoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaEventoHistorico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgendaEventoHistorico" ADD CONSTRAINT "AgendaEventoHistorico_agendaEventoId_fkey" FOREIGN KEY ("agendaEventoId") REFERENCES "AgendaEvento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEventoHistorico" ADD CONSTRAINT "AgendaEventoHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
