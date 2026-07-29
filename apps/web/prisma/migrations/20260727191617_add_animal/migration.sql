-- CreateEnum
CREATE TYPE "SexoAnimal" AS ENUM ('MACHO', 'FEMEA');

-- CreateEnum
CREATE TYPE "CategoriaAnimal" AS ENUM ('BEZERRO', 'NOVILHA', 'NOVILHO', 'VACA', 'MATRIZ', 'TOURO', 'BOI', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusAnimal" AS ENUM ('ATIVO', 'VENDIDO', 'MORTO', 'TRANSFERIDO');

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "loteId" TEXT,
    "identificador" TEXT NOT NULL,
    "sexo" "SexoAnimal" NOT NULL,
    "categoria" "CategoriaAnimal" NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "dataEntrada" TIMESTAMP(3) NOT NULL,
    "pesoEntrada" DOUBLE PRECISION,
    "status" "StatusAnimal" NOT NULL DEFAULT 'ATIVO',
    "dataSaida" TIMESTAMP(3),
    "motivoSaida" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Animal_empresaId_identificador_key" ON "Animal"("empresaId", "identificador");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
