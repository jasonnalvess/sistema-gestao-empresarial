-- V3.6.4 — Validade comercial/trial da empresa.
-- Migration exclusivamente aditiva: sem backfill, sem alteração destrutiva.
-- Empresas legadas permanecem com ambos os campos NULL (sem validade
-- limitada) e preservam integralmente o acesso atual.

ALTER TABLE "Empresa"
  ADD COLUMN "validadeComercialInicio" TIMESTAMP(3) NULL,
  ADD COLUMN "validadeComercialFim" TIMESTAMP(3) NULL;

-- Os dois campos devem ser nulos juntos (legado) ou preenchidos juntos (trial/regularização).
ALTER TABLE "Empresa"
  ADD CONSTRAINT "Empresa_validade_comercial_par_check"
  CHECK (
    ("validadeComercialInicio" IS NULL) = ("validadeComercialFim" IS NULL)
  );

-- Intervalo [inicio, fim) exige fim estritamente posterior ao início.
ALTER TABLE "Empresa"
  ADD CONSTRAINT "Empresa_validade_comercial_intervalo_check"
  CHECK (
    "validadeComercialInicio" IS NULL
    OR "validadeComercialFim" > "validadeComercialInicio"
  );

CREATE INDEX "Empresa_validadeComercialFim_idx"
  ON "Empresa" ("validadeComercialFim");
