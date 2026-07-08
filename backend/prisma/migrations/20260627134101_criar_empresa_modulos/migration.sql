-- CreateTable
CREATE TABLE "EmpresaModulo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmpresaModulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmpresaModulo_empresaId_moduloId_key" ON "EmpresaModulo"("empresaId", "moduloId");

-- AddForeignKey
ALTER TABLE "EmpresaModulo" ADD CONSTRAINT "EmpresaModulo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaModulo" ADD CONSTRAINT "EmpresaModulo_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloSistema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
