-- CreateTable
CREATE TABLE "ModuloSistema" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuloSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuloSistema_nome_key" ON "ModuloSistema"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ModuloSistema_chave_key" ON "ModuloSistema"("chave");
