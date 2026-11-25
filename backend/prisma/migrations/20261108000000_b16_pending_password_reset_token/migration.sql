-- Migration: B16 — estado ativo e pendente no PasswordResetToken
-- Aditiva. Não aplica dados, não invalida tokens existentes e preserva a FK,
-- o índice único de userId e o índice de expiresAt.
--
-- As constraints CHECK abaixo não são representadas integralmente pelo Prisma
-- Schema. Ao gerar novas migrations, revise o SQL produzido pelo Prisma Migrate
-- para não removê-las inadvertidamente.
--
-- Esta migration foi criada, mas NÃO foi aplicada nesta fase.

-- 1. O estado ativo passa a ser opcional para permitir uma linha apenas pendente.
ALTER TABLE "PasswordResetToken"
  ALTER COLUMN "tokenHash" DROP NOT NULL,
  ALTER COLUMN "expiresAt" DROP NOT NULL;

-- 2. Estado pendente da solicitação de recuperação.
ALTER TABLE "PasswordResetToken"
  ADD COLUMN "pendingTokenHash" TEXT,
  ADD COLUMN "pendingExpiresAt" TIMESTAMP(3),
  ADD COLUMN "pendingRequestId" TEXT,
  ADD COLUMN "pendingCreatedAt" TIMESTAMP(3);

-- 3. Índice único do hash ativo. O PostgreSQL permite múltiplos NULL.
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_pendingExpiresAt_idx"
  ON "PasswordResetToken"("pendingExpiresAt");

-- 4. Integridade dos estados.
-- tokenHash e expiresAt devem ser ambos NULL ou ambos preenchidos.
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_active_pair_check"
  CHECK (("tokenHash" IS NULL) = ("expiresAt" IS NULL));

-- Os quatro campos pending devem ser todos NULL ou todos preenchidos.
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_pending_set_check"
  CHECK (
    (
      "pendingTokenHash" IS NULL
      AND "pendingExpiresAt" IS NULL
      AND "pendingRequestId" IS NULL
      AND "pendingCreatedAt" IS NULL
    )
    OR
    (
      "pendingTokenHash" IS NOT NULL
      AND "pendingExpiresAt" IS NOT NULL
      AND "pendingRequestId" IS NOT NULL
      AND "pendingCreatedAt" IS NOT NULL
    )
  );

-- usedAt só pode existir quando há token ativo.
ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_used_requires_active_check"
  CHECK ("usedAt" IS NULL OR "tokenHash" IS NOT NULL);
