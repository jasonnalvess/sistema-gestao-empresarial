-- Garante que cada chave de perfil global seja única.
-- A restrição composta existente continua protegendo os perfis por empresa.
CREATE UNIQUE INDEX "Perfil_chave_global_key"
ON "Perfil" ("chave")
WHERE "empresaId" IS NULL;
