-- V3.5.2: persistência e integridade CRM; nenhuma conversão de dados legados.
-- SQL estrutural gerado por migrate diff entre datamodels, sem aplicação.
-- Preservar os CHECKs e o SET NULL seletivo em futuras migrations.
BEGIN;

-- Preflight: abortar sem reparar dados ou reutilizar objetos CRM existentes.
DO $$
DECLARE
    tabela TEXT;
    objeto TEXT;
    duplicado BOOLEAN;
BEGIN
    IF current_setting('server_version_num')::INTEGER < 150000 THEN
        RAISE EXCEPTION 'V3.5.2 CRM exige PostgreSQL 15 ou superior para SET NULL seletivo';
    END IF;

    FOREACH tabela IN ARRAY ARRAY['Empresa', 'Usuario', 'Cliente', 'AgendaEvento', 'Venda'] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema()
              AND c.relname = tabela
              AND c.relkind IN ('r', 'p')
        ) THEN
            RAISE EXCEPTION 'V3.5.2 CRM: tabela legada obrigatória ausente: %', tabela;
        END IF;
    END LOOP;

    FOREACH objeto IN ARRAY ARRAY[
        'CrmEtapa', 'CrmOportunidade', 'ClienteInteracao',
        'CrmOportunidadeHistorico', 'TipoEtapaCRM', 'TipoInteracaoCRM'
    ] LOOP
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema() AND c.relname = objeto
        ) OR EXISTS (
            SELECT 1 FROM pg_type t
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = current_schema() AND t.typname = objeto
        ) THEN
            RAISE EXCEPTION 'V3.5.2 CRM: objeto já existe no schema alvo: %', objeto;
        END IF;
    END LOOP;

    -- Manter os dados verificados estáveis até a conclusão da transação.
    LOCK TABLE "Empresa", "Usuario", "Cliente", "AgendaEvento", "Venda" IN SHARE MODE;

    IF EXISTS (SELECT 1 FROM "Cliente" WHERE "empresaId" IS NULL) THEN
        RAISE EXCEPTION 'V3.5.2 CRM: Cliente sem empresaId';
    END IF;
    IF EXISTS (SELECT 1 FROM "AgendaEvento" WHERE "empresaId" IS NULL) THEN
        RAISE EXCEPTION 'V3.5.2 CRM: AgendaEvento sem empresaId';
    END IF;
    IF EXISTS (SELECT 1 FROM "Venda" WHERE "empresaId" IS NULL) THEN
        RAISE EXCEPTION 'V3.5.2 CRM: Venda sem empresaId';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "Usuario"
        WHERE "tipo" IN ('ADMIN_EMPRESA', 'USUARIO_EMPRESA') AND "empresaId" IS NULL
    ) THEN
        RAISE EXCEPTION 'V3.5.2 CRM: usuário empresarial sem empresaId';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "AgendaEvento" a
        LEFT JOIN "Cliente" c ON c."id" = a."clienteId"
        WHERE a."clienteId" IS NOT NULL
          AND (c."id" IS NULL OR c."empresaId" IS DISTINCT FROM a."empresaId")
    ) THEN
        RAISE EXCEPTION 'V3.5.2 CRM: AgendaEvento referencia Cliente inválido ou de outra empresa';
    END IF;
    IF EXISTS (
        SELECT 1 FROM "Venda" v
        LEFT JOIN "Cliente" c ON c."id" = v."clienteId"
        WHERE c."id" IS NULL OR c."empresaId" IS DISTINCT FROM v."empresaId"
    ) THEN
        RAISE EXCEPTION 'V3.5.2 CRM: Venda referencia Cliente inválido ou de outra empresa';
    END IF;

    FOREACH tabela IN ARRAY ARRAY['Usuario', 'Cliente', 'AgendaEvento', 'Venda'] LOOP
        EXECUTE format(
            'SELECT EXISTS (SELECT 1 FROM %I.%I GROUP BY "empresaId", "id" HAVING COUNT(*) > 1)',
            current_schema(), tabela
        ) INTO duplicado;
        IF duplicado THEN
            RAISE EXCEPTION 'V3.5.2 CRM: duplicidade (empresaId,id) em %', tabela;
        END IF;
    END LOOP;
    IF EXISTS (
        SELECT 1 FROM "Venda"
        GROUP BY "empresaId", "id", "clienteId" HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'V3.5.2 CRM: duplicidade (empresaId,id,clienteId) em Venda';
    END IF;
END;
$$;

-- CreateEnum
CREATE TYPE "TipoEtapaCRM" AS ENUM ('ABERTA', 'GANHA', 'PERDIDA');

-- CreateEnum
CREATE TYPE "TipoInteracaoCRM" AS ENUM ('LIGACAO', 'EMAIL', 'MENSAGEM', 'REUNIAO', 'VISITA', 'NOTA', 'OUTRO');

-- CreateTable
CREATE TABLE "CrmEtapa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" "TipoEtapaCRM" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmEtapa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOportunidade" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "etapaId" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "valorEstimado" DECIMAL(65,30),
    "previsaoFechamento" TIMESTAMP(3),
    "dataFechamento" TIMESTAMP(3),
    "motivoPerda" TEXT,
    "vendaId" TEXT,
    "versaoRegistro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmOportunidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteInteracao" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "oportunidadeId" TEXT,
    "agendaEventoId" TEXT,
    "responsavelId" TEXT NOT NULL,
    "tipo" "TipoInteracaoCRM" NOT NULL,
    "assunto" TEXT,
    "descricao" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "versaoRegistro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteInteracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmOportunidadeHistorico" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "oportunidadeId" TEXT NOT NULL,
    "etapaAnteriorId" TEXT,
    "etapaNovaId" TEXT,
    "descricao" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmOportunidadeHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmEtapa_empresa_ativo_ordem_idx" ON "CrmEtapa"("empresaId", "ativo", "ordem", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CrmEtapa_empresaId_id_key" ON "CrmEtapa"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CrmOportunidade_vendaId_key" ON "CrmOportunidade"("vendaId");

-- CreateIndex
CREATE INDEX "CrmOportunidade_empresa_cliente_data_idx" ON "CrmOportunidade"("empresaId", "clienteId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CrmOportunidade_empresa_etapa_data_idx" ON "CrmOportunidade"("empresaId", "etapaId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CrmOportunidade_empresa_responsavel_data_idx" ON "CrmOportunidade"("empresaId", "responsavelId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CrmOportunidade_empresa_data_idx" ON "CrmOportunidade"("empresaId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CrmOportunidade_empresaId_id_key" ON "CrmOportunidade"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CrmOportunidade_empresa_id_cliente_key" ON "CrmOportunidade"("empresaId", "id", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmOportunidade_empresa_venda_cliente_key" ON "CrmOportunidade"("empresaId", "vendaId", "clienteId");

-- CreateIndex
CREATE INDEX "ClienteInteracao_empresa_cliente_data_idx" ON "ClienteInteracao"("empresaId", "clienteId", "dataHora", "id");

-- CreateIndex
CREATE INDEX "ClienteInteracao_empresa_oportunidade_cliente_idx" ON "ClienteInteracao"("empresaId", "oportunidadeId", "clienteId");

-- CreateIndex
CREATE INDEX "ClienteInteracao_empresa_agenda_idx" ON "ClienteInteracao"("empresaId", "agendaEventoId");

-- CreateIndex
CREATE INDEX "ClienteInteracao_empresa_responsavel_data_idx" ON "ClienteInteracao"("empresaId", "responsavelId", "dataHora", "id");

-- CreateIndex
CREATE INDEX "ClienteInteracao_empresa_data_idx" ON "ClienteInteracao"("empresaId", "dataHora", "id");

-- CreateIndex
CREATE INDEX "CrmHistorico_empresa_oportunidade_data_idx" ON "CrmOportunidadeHistorico"("empresaId", "oportunidadeId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "CrmHistorico_empresa_etapa_anterior_idx" ON "CrmOportunidadeHistorico"("empresaId", "etapaAnteriorId");

-- CreateIndex
CREATE INDEX "CrmHistorico_empresa_etapa_nova_idx" ON "CrmOportunidadeHistorico"("empresaId", "etapaNovaId");

-- CreateIndex
CREATE INDEX "CrmHistorico_usuario_idx" ON "CrmOportunidadeHistorico"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_empresaId_id_key" ON "Usuario"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaEvento_empresaId_id_key" ON "AgendaEvento"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_empresaId_id_key" ON "Cliente"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_empresaId_id_key" ON "Venda"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_empresa_id_cliente_key" ON "Venda"("empresaId", "id", "clienteId");

-- AddForeignKey
ALTER TABLE "CrmEtapa" ADD CONSTRAINT "CrmEtapa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOportunidade" ADD CONSTRAINT "CrmOportunidade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOportunidade" ADD CONSTRAINT "CrmOportunidade_empresaId_clienteId_fkey" FOREIGN KEY ("empresaId", "clienteId") REFERENCES "Cliente"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CrmOportunidade" ADD CONSTRAINT "CrmOportunidade_empresaId_etapaId_fkey" FOREIGN KEY ("empresaId", "etapaId") REFERENCES "CrmEtapa"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CrmOportunidade" ADD CONSTRAINT "CrmOportunidade_empresaId_responsavelId_fkey" FOREIGN KEY ("empresaId", "responsavelId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CrmOportunidade" ADD CONSTRAINT "CrmOportunidade_empresaId_vendaId_clienteId_fkey" FOREIGN KEY ("empresaId", "vendaId", "clienteId") REFERENCES "Venda"("empresaId", "id", "clienteId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClienteInteracao" ADD CONSTRAINT "ClienteInteracao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteInteracao" ADD CONSTRAINT "ClienteInteracao_empresaId_clienteId_fkey" FOREIGN KEY ("empresaId", "clienteId") REFERENCES "Cliente"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClienteInteracao" ADD CONSTRAINT "ClienteInteracao_empresaId_oportunidadeId_clienteId_fkey" FOREIGN KEY ("empresaId", "oportunidadeId", "clienteId") REFERENCES "CrmOportunidade"("empresaId", "id", "clienteId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClienteInteracao" ADD CONSTRAINT "ClienteInteracao_empresaId_responsavelId_fkey" FOREIGN KEY ("empresaId", "responsavelId") REFERENCES "Usuario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "ClienteInteracao" ADD CONSTRAINT "ClienteInteracao_empresaId_agendaEventoId_fkey" FOREIGN KEY ("empresaId", "agendaEventoId") REFERENCES "AgendaEvento"("empresaId", "id") ON DELETE SET NULL ("agendaEventoId") ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CrmOportunidadeHistorico" ADD CONSTRAINT "CrmOportunidadeHistorico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmOportunidadeHistorico" ADD CONSTRAINT "CrmOportunidadeHistorico_empresaId_oportunidadeId_fkey" FOREIGN KEY ("empresaId", "oportunidadeId") REFERENCES "CrmOportunidade"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CrmOportunidadeHistorico" ADD CONSTRAINT "CrmOportunidadeHistorico_empresaId_etapaAnteriorId_fkey" FOREIGN KEY ("empresaId", "etapaAnteriorId") REFERENCES "CrmEtapa"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CrmOportunidadeHistorico" ADD CONSTRAINT "CrmOportunidadeHistorico_empresaId_etapaNovaId_fkey" FOREIGN KEY ("empresaId", "etapaNovaId") REFERENCES "CrmEtapa"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CrmOportunidadeHistorico" ADD CONSTRAINT "CrmOportunidadeHistorico_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- CHECKs locais aprovados; estado comercial permanece derivado da etapa.
ALTER TABLE "CrmEtapa"
ADD CONSTRAINT "CrmEtapa_ordem_check"
CHECK ("ordem" >= 0);

ALTER TABLE "CrmOportunidade"
ADD CONSTRAINT "CrmOportunidade_valorEstimado_check"
CHECK (
    "valorEstimado" IS NULL
    OR (
        "valorEstimado" >= 0
        AND "valorEstimado" <> 'NaN'::numeric
    )
);

ALTER TABLE "CrmOportunidade"
ADD CONSTRAINT "CrmOportunidade_versaoRegistro_check"
CHECK ("versaoRegistro" >= 0);

ALTER TABLE "ClienteInteracao"
ADD CONSTRAINT "ClienteInteracao_versaoRegistro_check"
CHECK ("versaoRegistro" >= 0);

COMMIT;
