-- Impede a aplicacao silenciosa caso existam aberturas ativas duplicadas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "AberturaCaixa" WHERE "aberto" = true
    GROUP BY "caixaId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existem caixas com mais de uma abertura ativa';
  END IF;
END $$;

CREATE UNIQUE INDEX "AberturaCaixa_caixaId_aberto_key"
ON "AberturaCaixa"("caixaId") WHERE "aberto" = true;

CREATE TABLE "CaixaHistorico" (
  "id" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "caixaId" TEXT NOT NULL,
  "usuarioId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaixaHistorico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CaixaHistorico_empresaId_idx" ON "CaixaHistorico"("empresaId");
CREATE INDEX "CaixaHistorico_caixaId_idx" ON "CaixaHistorico"("caixaId");
CREATE INDEX "CaixaHistorico_createdAt_idx" ON "CaixaHistorico"("createdAt");

ALTER TABLE "CaixaHistorico" ADD CONSTRAINT "CaixaHistorico_empresaId_fkey"
FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaixaHistorico" ADD CONSTRAINT "CaixaHistorico_caixaId_fkey"
FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CaixaHistorico" ADD CONSTRAINT "CaixaHistorico_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
