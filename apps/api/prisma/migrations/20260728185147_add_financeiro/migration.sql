-- CreateEnum
CREATE TYPE "NaturezaFinanceira" AS ENUM ('RECEITA', 'DESPESA');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('PIX', 'BOLETO', 'FATURA', 'DEBITO_AUTOMATICO', 'TRANSFERENCIA', 'DINHEIRO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoContato" AS ENUM ('CLIENTE', 'FORNECEDOR', 'AMBOS');

-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "moduloFinanceiroAtivo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "GrupoFinanceiro" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "natureza" "NaturezaFinanceira" NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GrupoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaFinanceira" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContaFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaBancaria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "saldoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "dataSaldoInicial" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ContaBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contato" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoContato" NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "telefone" TEXT,
    "email" TEXT,

    CONSTRAINT "Contato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "loteId" TEXT,
    "contatoId" TEXT,
    "contaBancariaId" TEXT,
    "formaPagamento" "FormaPagamento",
    "descricao" TEXT,
    "documento" TEXT,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "totalParcelas" INTEGER NOT NULL DEFAULT 1,
    "numeroParcela" INTEGER NOT NULL DEFAULT 1,
    "valorParcela" DECIMAL(14,2) NOT NULL,
    "dataDocumento" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataLiquidacao" TIMESTAMP(3),

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrupoFinanceiro_empresaId_codigo_key" ON "GrupoFinanceiro"("empresaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ContaFinanceira_grupoId_codigo_key" ON "ContaFinanceira"("grupoId", "codigo");

-- CreateIndex
CREATE INDEX "Lancamento_empresaId_dataDocumento_idx" ON "Lancamento"("empresaId", "dataDocumento");

-- CreateIndex
CREATE INDEX "Lancamento_empresaId_dataLiquidacao_idx" ON "Lancamento"("empresaId", "dataLiquidacao");

-- AddForeignKey
ALTER TABLE "GrupoFinanceiro" ADD CONSTRAINT "GrupoFinanceiro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaFinanceira" ADD CONSTRAINT "ContaFinanceira_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoFinanceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContaBancaria" ADD CONSTRAINT "ContaBancaria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contato" ADD CONSTRAINT "Contato_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaFinanceira"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contatoId_fkey" FOREIGN KEY ("contatoId") REFERENCES "Contato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_contaBancariaId_fkey" FOREIGN KEY ("contaBancariaId") REFERENCES "ContaBancaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
