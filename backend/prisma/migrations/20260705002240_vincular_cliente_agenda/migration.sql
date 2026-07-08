-- AlterTable
ALTER TABLE "AgendaEvento" ADD COLUMN     "clienteId" TEXT;

-- AddForeignKey
ALTER TABLE "AgendaEvento" ADD CONSTRAINT "AgendaEvento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
