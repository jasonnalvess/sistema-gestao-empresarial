-- DropIndex
DROP INDEX "ContaPagar_pedidoCompraId_idx";

-- CreateTable
CREATE TABLE "Perfil" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Perfil_empresaId_idx" ON "Perfil"("empresaId");

-- CreateIndex
CREATE INDEX "Perfil_ativo_idx" ON "Perfil"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_empresaId_chave_key" ON "Perfil"("empresaId", "chave");

-- AddForeignKey
ALTER TABLE "Perfil" ADD CONSTRAINT "Perfil_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
