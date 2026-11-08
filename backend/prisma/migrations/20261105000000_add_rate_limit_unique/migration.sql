-- Migration: Add unique constraint to RateLimit
-- Version: V3.6.2-A_RateLimit_Unique
-- Description: Adiciona constraint UNIQUE para suportar ON CONFLICT no RateLimit

-- 1. Identificar e tratar duplicidades existentes para evitar falha na criação da constraint
-- Nota: Em ambiente de teste, a recomendação é limpar a tabela ou remover duplicatas manuais.
-- Como esta migration é automatizada, utilizamos a abordagem de remover duplicatas mantendo o registro mais recente.

WITH cte AS (
    SELECT ctid,
           ROW_NUMBER() OVER (
               PARTITION BY "clientIp", "endpoint", "windowStart"
               ORDER BY "createdAt" DESC
           ) as row_num
    FROM "RateLimit"
)
DELETE FROM "RateLimit"
WHERE ctid IN (SELECT ctid FROM cte WHERE row_num > 1);

-- 2. Criar a constraint UNIQUE
ALTER TABLE "RateLimit"
ADD CONSTRAINT "uq_rate_limit_window"
UNIQUE ("clientIp", "endpoint", "windowStart");
