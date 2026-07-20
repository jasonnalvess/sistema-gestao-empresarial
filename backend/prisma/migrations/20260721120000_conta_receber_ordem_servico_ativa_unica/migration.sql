-- Impede a criação do índice caso já existam contas ativas duplicadas por ordem de serviço.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ContaReceber"
    WHERE "ordemServicoId" IS NOT NULL
      AND "status" <> 'CANCELADA'
    GROUP BY "ordemServicoId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existem ordens de serviço com mais de uma conta a receber ativa';
  END IF;
END $$;

CREATE UNIQUE INDEX "ContaReceber_ordemServicoId_ativa_key"
ON "ContaReceber"("ordemServicoId")
WHERE "ordemServicoId" IS NOT NULL AND "status" <> 'CANCELADA';
