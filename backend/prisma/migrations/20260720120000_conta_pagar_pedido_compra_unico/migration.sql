-- A regra atual gera exatamente uma conta a pagar por pedido de compra.
-- Interrompe com seguranca se houver dados incompativeis.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ContaPagar"
    WHERE "pedidoCompraId" IS NOT NULL
    GROUP BY "pedidoCompraId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existem pedidos de compra vinculados a mais de uma conta a pagar';
  END IF;
END $$;

CREATE UNIQUE INDEX "ContaPagar_pedidoCompraId_key"
ON "ContaPagar"("pedidoCompraId");
