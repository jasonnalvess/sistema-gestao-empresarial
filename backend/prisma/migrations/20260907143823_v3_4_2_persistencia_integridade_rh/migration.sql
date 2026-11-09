-- V3.4.2: persistência de RH. IDs seguem String + uuid() do schema existente.
-- PostgreSQL 15+: SET NULL (coluna) preserva empresaId nas FKs compostas.
-- Prisma não representa essa lista de colunas; preservá-la em futuras migrations.
BEGIN;

-- CreateEnum
CREATE TYPE "StatusFuncionario" AS ENUM ('ATIVO', 'FERIAS', 'AFASTADO', 'LICENCA', 'INATIVO', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "TipoVinculoFuncionario" AS ENUM ('CLT', 'ESTAGIARIO', 'APRENDIZ', 'TEMPORARIO', 'TERCEIRIZADO', 'PRESTADOR_SERVICO', 'SOCIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "OrigemFuncionarioHistorico" AS ENUM ('RH', 'USUARIO', 'SISTEMA');

-- CreateEnum
CREATE TYPE "EstadoAcessoFuncionario" AS ENUM ('SEM_USUARIO', 'USUARIO_ATIVO', 'USUARIO_INATIVO');

-- CreateEnum
CREATE TYPE "TipoEventoFuncionarioHistorico" AS ENUM ('CRIACAO', 'EDICAO', 'ALTERACAO_CARGO', 'ALTERACAO_DEPARTAMENTO', 'ALTERACAO_GESTOR', 'ALTERACAO_STATUS', 'RECLASSIFICACAO_STATUS', 'CRIACAO_ACESSO', 'VINCULO_ACESSO', 'DESVINCULO_ACESSO', 'INATIVACAO_ACESSO', 'REATIVACAO_ACESSO', 'REDEFINICAO_SENHA');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "trocaSenhaObrigatoria" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Cargo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funcionario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomePreferido" TEXT,
    "cpf" TEXT,
    "emailCorporativo" TEXT,
    "telefoneCorporativo" TEXT,
    "emailPessoal" TEXT,
    "telefonePessoal" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "matricula" TEXT NOT NULL,
    "dataAdmissao" TIMESTAMP(3) NOT NULL,
    "dataDesligamento" TIMESTAMP(3),
    "tipoVinculo" "TipoVinculoFuncionario" NOT NULL,
    "cargoId" TEXT,
    "departamentoId" TEXT,
    "gestorId" TEXT,
    "status" "StatusFuncionario" NOT NULL,
    "statusDesde" TIMESTAMP(3) NOT NULL,
    "usuarioId" TEXT,
    "versaoRegistro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Funcionario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuncionarioHistorico" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "tipo" "TipoEventoFuncionarioHistorico" NOT NULL,
    "statusAnterior" "StatusFuncionario",
    "statusNovo" "StatusFuncionario",
    "acessoAnterior" "EstadoAcessoFuncionario",
    "acessoNovo" "EstadoAcessoFuncionario",
    "origem" "OrigemFuncionarioHistorico" NOT NULL,
    "atorUsuarioId" TEXT,
    "usuarioAfetadoId" TEXT,
    "acaoAcessoSolicitada" TEXT,
    "operacaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuncionarioHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cargo_empresaId_ativo_idx" ON "Cargo"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_empresaId_id_key" ON "Cargo"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_empresaId_nome_key" ON "Cargo"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "Departamento_empresaId_ativo_idx" ON "Departamento"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_empresaId_id_key" ON "Departamento"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_empresaId_nome_key" ON "Departamento"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_usuarioId_key" ON "Funcionario"("usuarioId");

-- CreateIndex
CREATE INDEX "Funcionario_empresaId_status_idx" ON "Funcionario"("empresaId", "status");

-- CreateIndex
CREATE INDEX "Funcionario_empresaId_cargoId_idx" ON "Funcionario"("empresaId", "cargoId");

-- CreateIndex
CREATE INDEX "Funcionario_empresaId_departamentoId_idx" ON "Funcionario"("empresaId", "departamentoId");

-- CreateIndex
CREATE INDEX "Funcionario_empresaId_gestorId_idx" ON "Funcionario"("empresaId", "gestorId");

-- CreateIndex
CREATE INDEX "Funcionario_empresaId_createdAt_idx" ON "Funcionario"("empresaId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_empresaId_id_key" ON "Funcionario"("empresaId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_empresaId_matricula_key" ON "Funcionario"("empresaId", "matricula");

-- CreateIndex
CREATE UNIQUE INDEX "Funcionario_empresaId_cpf_key" ON "Funcionario"("empresaId", "cpf");

-- CreateIndex
CREATE INDEX "FuncionarioHistorico_empresaId_funcionarioId_createdAt_idx" ON "FuncionarioHistorico"("empresaId", "funcionarioId", "createdAt");

-- CreateIndex
CREATE INDEX "FuncionarioHistorico_empresaId_createdAt_idx" ON "FuncionarioHistorico"("empresaId", "createdAt");

-- CreateIndex
CREATE INDEX "FuncionarioHistorico_atorUsuarioId_idx" ON "FuncionarioHistorico"("atorUsuarioId");

-- CreateIndex
CREATE INDEX "FuncionarioHistorico_usuarioAfetadoId_idx" ON "FuncionarioHistorico"("usuarioAfetadoId");

-- CreateIndex
CREATE INDEX "FuncionarioHistorico_operacaoId_idx" ON "FuncionarioHistorico"("operacaoId");

-- AddForeignKey
ALTER TABLE "Cargo" ADD CONSTRAINT "Cargo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_empresaId_cargoId_fkey" FOREIGN KEY ("empresaId", "cargoId") REFERENCES "Cargo"("empresaId", "id") ON DELETE SET NULL ("cargoId") ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_empresaId_departamentoId_fkey" FOREIGN KEY ("empresaId", "departamentoId") REFERENCES "Departamento"("empresaId", "id") ON DELETE SET NULL ("departamentoId") ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_empresaId_gestorId_fkey" FOREIGN KEY ("empresaId", "gestorId") REFERENCES "Funcionario"("empresaId", "id") ON DELETE SET NULL ("gestorId") ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Funcionario" ADD CONSTRAINT "Funcionario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncionarioHistorico" ADD CONSTRAINT "FuncionarioHistorico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncionarioHistorico" ADD CONSTRAINT "FuncionarioHistorico_empresaId_funcionarioId_fkey" FOREIGN KEY ("empresaId", "funcionarioId") REFERENCES "Funcionario"("empresaId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "FuncionarioHistorico" ADD CONSTRAINT "FuncionarioHistorico_atorUsuarioId_fkey" FOREIGN KEY ("atorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncionarioHistorico" ADD CONSTRAINT "FuncionarioHistorico_usuarioAfetadoId_fkey" FOREIGN KEY ("usuarioAfetadoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integridade funcional independente de validações da aplicação.
ALTER TABLE "Funcionario"
  ADD CONSTRAINT "Funcionario_gestor_distinto_check"
    CHECK ("gestorId" IS NULL OR "gestorId" <> "id"),
  ADD CONSTRAINT "Funcionario_desligamento_status_check"
    CHECK (("status" = 'DESLIGADO' AND "dataDesligamento" IS NOT NULL)
        OR ("status" <> 'DESLIGADO' AND "dataDesligamento" IS NULL)),
  ADD CONSTRAINT "Funcionario_desligamento_data_check"
    CHECK ("dataDesligamento" IS NULL OR "dataDesligamento" >= "dataAdmissao");

COMMIT;
