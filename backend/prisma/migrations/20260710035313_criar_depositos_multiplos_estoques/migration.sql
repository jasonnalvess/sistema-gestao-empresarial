-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.

ALTER TYPE "TipoMovimentacaoEstoque" ADD VALUE 'TRANSFERENCIA_ENTRADA';
ALTER TYPE "TipoMovimentacaoEstoque" ADD VALUE 'TRANSFERENCIA_SAIDA';

-- Criar tabela Deposito
CREATE TABLE "Deposito" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "endereco" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposito_pkey" PRIMARY KEY ("id")
);

-- Adicionar colunas como opcionais primeiro
ALTER TABLE "EstoqueProduto" 
ADD COLUMN "depositoId" TEXT,
ADD COLUMN "custoMedio" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN "ultimoCusto" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- Criar um depósito padrão para cada empresa que possui estoque
INSERT INTO "Deposito" (
    "id",
    "nome",
    "codigo",
    "descricao",
    "ativo",
    "empresaId",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    'Depósito Principal',
    'PRINCIPAL',
    'Depósito padrão criado automaticamente na migração',
    true,
    e."empresaId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT "empresaId"
    FROM "EstoqueProduto"
) e;

-- Vincular os estoques existentes ao depósito principal
UPDATE "EstoqueProduto" ep
SET "depositoId" = d."id"
FROM "Deposito" d
WHERE d."empresaId" = ep."empresaId"
  AND d."codigo" = 'PRINCIPAL';

-- Tornar depositoId obrigatório após preencher todos os registros
ALTER TABLE "EstoqueProduto"
ALTER COLUMN "depositoId" SET NOT NULL;

-- Remover índices únicos antigos
DROP INDEX IF EXISTS "EstoqueProduto_produtoId_key";
DROP INDEX IF EXISTS "EstoqueProduto_empresaId_produtoId_key";

-- Criar novo índice único com depositoId
CREATE UNIQUE INDEX "EstoqueProduto_empresaId_produtoId_depositoId_key" 
ON "EstoqueProduto"("empresaId", "produtoId", "depositoId");

-- Criar índices únicos do depósito
CREATE UNIQUE INDEX "Deposito_empresaId_codigo_key" 
ON "Deposito"("empresaId", "codigo");

CREATE UNIQUE INDEX "Deposito_empresaId_nome_key" 
ON "Deposito"("empresaId", "nome");

-- Adicionar chave estrangeira do Deposito para Empresa
ALTER TABLE "Deposito" 
ADD CONSTRAINT "Deposito_empresaId_fkey" 
FOREIGN KEY ("empresaId") 
REFERENCES "Empresa"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- Adicionar chave estrangeira do EstoqueProduto para Deposito
ALTER TABLE "EstoqueProduto" 
ADD CONSTRAINT "EstoqueProduto_depositoId_fkey" 
FOREIGN KEY ("depositoId") 
REFERENCES "Deposito"("id") 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- Adicionar novas colunas na MovimentacaoEstoque como opcionais
ALTER TABLE "MovimentacaoEstoque" 
ADD COLUMN "depositoId" TEXT,
ADD COLUMN "saldoAnterior" DECIMAL(65,30),
ADD COLUMN "saldoPosterior" DECIMAL(65,30),
ADD COLUMN "custoUnitario" DECIMAL(65,30),
ADD COLUMN "documentoReferencia" TEXT;

-- Vincular movimentações antigas ao depósito principal
UPDATE "MovimentacaoEstoque" me
SET "depositoId" = d."id"
FROM "Deposito" d
WHERE d."empresaId" = me."empresaId"
  AND d."codigo" = 'PRINCIPAL';

-- Adicionar chave estrangeira da MovimentacaoEstoque para Deposito
ALTER TABLE "MovimentacaoEstoque" 
ADD CONSTRAINT "MovimentacaoEstoque_depositoId_fkey" 
FOREIGN KEY ("depositoId") 
REFERENCES "Deposito"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;
