-- CreateTable
CREATE TABLE "UsuarioPerfil" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "atribuidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioPerfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsuarioPerfil_usuarioId_idx" ON "UsuarioPerfil"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioPerfil_perfilId_idx" ON "UsuarioPerfil"("perfilId");

-- CreateIndex
CREATE INDEX "UsuarioPerfil_ativo_idx" ON "UsuarioPerfil"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioPerfil_usuarioId_perfilId_key" ON "UsuarioPerfil"("usuarioId", "perfilId");

-- AddForeignKey
ALTER TABLE "UsuarioPerfil" ADD CONSTRAINT "UsuarioPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioPerfil" ADD CONSTRAINT "UsuarioPerfil_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;
