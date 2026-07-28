-- CreateEnum
CREATE TYPE "TipoMetodoManejo" AS ENUM ('EXTENSIVO', 'SEMICONFINAMENTO', 'TIP', 'CONFINAMENTO', 'RECRIA', 'NAO_DEFINIDO');

-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "areaHectares" DOUBLE PRECISION,
ADD COLUMN     "gmdEsperado" DOUBLE PRECISION,
ADD COLUMN     "rendimentoCarcaca" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "MetodoManejo" ADD COLUMN     "tipo" "TipoMetodoManejo" NOT NULL DEFAULT 'NAO_DEFINIDO';

-- CreateTable
CREATE TABLE "LoteMetodoHistorico" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "metodoManejoId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),

    CONSTRAINT "LoteMetodoHistorico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LoteMetodoHistorico" ADD CONSTRAINT "LoteMetodoHistorico_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteMetodoHistorico" ADD CONSTRAINT "LoteMetodoHistorico_metodoManejoId_fkey" FOREIGN KEY ("metodoManejoId") REFERENCES "MetodoManejo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
