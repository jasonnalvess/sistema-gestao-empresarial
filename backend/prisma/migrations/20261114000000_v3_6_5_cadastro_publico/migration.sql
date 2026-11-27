-- V3.6.5 — Cadastro publico: solicitacao pendente e verificacao de e-mail.
-- Migration exclusivamente aditiva: sem backfill destrutivo, sem exclusoes,
-- sem alteracao de dados existentes.
-- Usuario.emailVerificado: NOT NULL DEFAULT true aproveita fast default do
-- PostgreSQL 11+ (sem reescrita de tabela); usuarios preexistentes continuam
-- considerados verificados, sem qualquer mudanca de acesso.

ALTER TABLE "Usuario"
  ADD COLUMN "emailVerificado" BOOLEAN NOT NULL DEFAULT true;

-- Tipo do estado da solicitacao.
CREATE TYPE "SolicitacaoCadastroEstado" AS ENUM ('PENDENTE', 'CONCLUIDA');

CREATE TABLE "SolicitacaoCadastro" (
    "id" TEXT NOT NULL,
    "nomeEmpresa" TEXT NOT NULL,
    "cnpjEmpresa" TEXT,
    "nomeResponsavel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "estado" "SolicitacaoCadastroEstado" NOT NULL DEFAULT 'PENDENTE',
    "tentativasEnvio" INTEGER NOT NULL DEFAULT 0,
    "ultimoEnvioEm" TIMESTAMP(3),
    "ultimoErroEnvio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoCadastro_pkey" PRIMARY KEY ("id")
);

-- Unicidade do hash do token (nunca token em texto puro).
CREATE UNIQUE INDEX "SolicitacaoCadastro_tokenHash_key"
  ON "SolicitacaoCadastro"("tokenHash");

-- Busca por e-mail do solicitante.
CREATE INDEX "SolicitacaoCadastro_email_idx"
  ON "SolicitacaoCadastro"("email");

-- Expiracao (validade 24h) e limpeza futura de solicitacoes antigas.
CREATE INDEX "SolicitacaoCadastro_expiresAt_idx"
  ON "SolicitacaoCadastro"("expiresAt");
