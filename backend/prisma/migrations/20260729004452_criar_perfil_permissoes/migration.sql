-- CreateTable
CREATE TABLE "PerfilPermissao" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "permissaoId" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerfilPermissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerfilPermissao_perfilId_idx" ON "PerfilPermissao"("perfilId");

-- CreateIndex
CREATE INDEX "PerfilPermissao_permissaoId_idx" ON "PerfilPermissao"("permissaoId");

-- CreateIndex
CREATE INDEX "PerfilPermissao_permitido_idx" ON "PerfilPermissao"("permitido");

-- CreateIndex
CREATE UNIQUE INDEX "PerfilPermissao_perfilId_permissaoId_key" ON "PerfilPermissao"("perfilId", "permissaoId");

-- AddForeignKey
ALTER TABLE "PerfilPermissao" ADD CONSTRAINT "PerfilPermissao_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerfilPermissao" ADD CONSTRAINT "PerfilPermissao_permissaoId_fkey" FOREIGN KEY ("permissaoId") REFERENCES "Permissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
