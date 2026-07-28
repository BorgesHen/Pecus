-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "alturaIdealPastoPadrao" DOUBLE PRECISION NOT NULL DEFAULT 60,
ADD COLUMN     "moduloPiquetesAtivo" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Piquete" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "areaHectares" DOUBLE PRECISION,
    "alturaIdealCm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Piquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAlturaPasto" (
    "id" TEXT NOT NULL,
    "piqueteId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "alturaCm" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAlturaPasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcupacaoPiquete" (
    "id" TEXT NOT NULL,
    "piqueteId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),

    CONSTRAINT "OcupacaoPiquete_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Piquete" ADD CONSTRAINT "Piquete_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAlturaPasto" ADD CONSTRAINT "RegistroAlturaPasto_piqueteId_fkey" FOREIGN KEY ("piqueteId") REFERENCES "Piquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcupacaoPiquete" ADD CONSTRAINT "OcupacaoPiquete_piqueteId_fkey" FOREIGN KEY ("piqueteId") REFERENCES "Piquete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
