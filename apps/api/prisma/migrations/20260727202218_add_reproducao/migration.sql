-- CreateEnum
CREATE TYPE "TipoEventoReprodutivo" AS ENUM ('ESTACAO_MONTA', 'INSEMINACAO', 'DIAGNOSTICO_GESTACAO', 'PARTO', 'DESMAME', 'DESCARTE');

-- CreateTable
CREATE TABLE "EventoReprodutivo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "tipo" "TipoEventoReprodutivo" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT,
    "criaId" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoReprodutivo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventoReprodutivo" ADD CONSTRAINT "EventoReprodutivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoReprodutivo" ADD CONSTRAINT "EventoReprodutivo_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoReprodutivo" ADD CONSTRAINT "EventoReprodutivo_criaId_fkey" FOREIGN KEY ("criaId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
