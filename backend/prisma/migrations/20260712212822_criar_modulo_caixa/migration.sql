-- CreateEnum
CREATE TYPE "StatusCaixa" AS ENUM ('ABERTO', 'FECHADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipoMovimentacaoCaixa" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "OrigemMovimentacaoCaixa" AS ENUM ('MANUAL', 'CONTA_PAGAR', 'CONTA_RECEBER', 'VENDA', 'AJUSTE', 'OUTRA');

-- CreateTable
CREATE TABLE "Caixa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusCaixa" NOT NULL DEFAULT 'FECHADO',
    "saldoAtual" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "empresaId" TEXT NOT NULL,
    "usuarioCriacaoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AberturaCaixa" (
    "id" TEXT NOT NULL,
    "dataAbertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataFechamento" TIMESTAMP(3),
    "saldoInicial" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "saldoSistema" DECIMAL(65,30),
    "saldoInformado" DECIMAL(65,30),
    "diferenca" DECIMAL(65,30),
    "observacaoAbertura" TEXT,
    "observacaoFechamento" TEXT,
    "aberto" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "caixaId" TEXT NOT NULL,
    "usuarioAberturaId" TEXT,
    "usuarioFechamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AberturaCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimentacaoCaixa" (
    "id" TEXT NOT NULL,
    "tipo" "TipoMovimentacaoCaixa" NOT NULL,
    "origem" "OrigemMovimentacaoCaixa" NOT NULL,
    "descricao" TEXT NOT NULL,
    "documento" TEXT,
    "observacao" TEXT,
    "valor" DECIMAL(65,30) NOT NULL,
    "saldoAnterior" DECIMAL(65,30) NOT NULL,
    "saldoPosterior" DECIMAL(65,30) NOT NULL,
    "dataMovimentacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "empresaId" TEXT NOT NULL,
    "caixaId" TEXT NOT NULL,
    "aberturaCaixaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "pagamentoContaPagarId" TEXT,
    "recebimentoContaReceberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimentacaoCaixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Caixa_empresaId_idx" ON "Caixa"("empresaId");

-- CreateIndex
CREATE INDEX "Caixa_status_idx" ON "Caixa"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Caixa_empresaId_codigo_key" ON "Caixa"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Caixa_empresaId_nome_key" ON "Caixa"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "AberturaCaixa_empresaId_idx" ON "AberturaCaixa"("empresaId");

-- CreateIndex
CREATE INDEX "AberturaCaixa_caixaId_idx" ON "AberturaCaixa"("caixaId");

-- CreateIndex
CREATE INDEX "AberturaCaixa_aberto_idx" ON "AberturaCaixa"("aberto");

-- CreateIndex
CREATE INDEX "AberturaCaixa_dataAbertura_idx" ON "AberturaCaixa"("dataAbertura");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoCaixa_pagamentoContaPagarId_key" ON "MovimentacaoCaixa"("pagamentoContaPagarId");

-- CreateIndex
CREATE UNIQUE INDEX "MovimentacaoCaixa_recebimentoContaReceberId_key" ON "MovimentacaoCaixa"("recebimentoContaReceberId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_empresaId_idx" ON "MovimentacaoCaixa"("empresaId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_caixaId_idx" ON "MovimentacaoCaixa"("caixaId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_aberturaCaixaId_idx" ON "MovimentacaoCaixa"("aberturaCaixaId");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_tipo_idx" ON "MovimentacaoCaixa"("tipo");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_origem_idx" ON "MovimentacaoCaixa"("origem");

-- CreateIndex
CREATE INDEX "MovimentacaoCaixa_dataMovimentacao_idx" ON "MovimentacaoCaixa"("dataMovimentacao");

-- AddForeignKey
ALTER TABLE "Caixa" ADD CONSTRAINT "Caixa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixa" ADD CONSTRAINT "Caixa_usuarioCriacaoId_fkey" FOREIGN KEY ("usuarioCriacaoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AberturaCaixa" ADD CONSTRAINT "AberturaCaixa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AberturaCaixa" ADD CONSTRAINT "AberturaCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AberturaCaixa" ADD CONSTRAINT "AberturaCaixa_usuarioAberturaId_fkey" FOREIGN KEY ("usuarioAberturaId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AberturaCaixa" ADD CONSTRAINT "AberturaCaixa_usuarioFechamentoId_fkey" FOREIGN KEY ("usuarioFechamentoId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_caixaId_fkey" FOREIGN KEY ("caixaId") REFERENCES "Caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_aberturaCaixaId_fkey" FOREIGN KEY ("aberturaCaixaId") REFERENCES "AberturaCaixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_pagamentoContaPagarId_fkey" FOREIGN KEY ("pagamentoContaPagarId") REFERENCES "PagamentoContaPagar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimentacaoCaixa" ADD CONSTRAINT "MovimentacaoCaixa_recebimentoContaReceberId_fkey" FOREIGN KEY ("recebimentoContaReceberId") REFERENCES "RecebimentoContaReceber"("id") ON DELETE SET NULL ON UPDATE CASCADE;
