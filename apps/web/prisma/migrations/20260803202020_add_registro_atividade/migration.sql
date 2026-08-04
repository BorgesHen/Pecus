-- CreateEnum
CREATE TYPE "AcaoAtividade" AS ENUM ('CRIACAO', 'ATUALIZACAO', 'EXCLUSAO', 'MOVIMENTACAO');

-- CreateTable
CREATE TABLE "RegistroAtividade" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "acao" "AcaoAtividade" NOT NULL,
    "entidade" TEXT NOT NULL,
    "registroId" TEXT,
    "descricao" TEXT NOT NULL,
    "detalhes" JSONB,
    "autorId" TEXT,
    "autorNome" TEXT NOT NULL,
    "autorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAtividade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroAtividade_empresaId_createdAt_idx" ON "RegistroAtividade"("empresaId", "createdAt");

-- CreateIndex
CREATE INDEX "RegistroAtividade_empresaId_entidade_createdAt_idx" ON "RegistroAtividade"("empresaId", "entidade", "createdAt");

-- CreateIndex
CREATE INDEX "RegistroAtividade_empresaId_entidade_registroId_idx" ON "RegistroAtividade"("empresaId", "entidade", "registroId");

-- CreateIndex
CREATE INDEX "RegistroAtividade_empresaId_acao_createdAt_idx" ON "RegistroAtividade"("empresaId", "acao", "createdAt");

-- AddForeignKey
ALTER TABLE "RegistroAtividade" ADD CONSTRAINT "RegistroAtividade_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
