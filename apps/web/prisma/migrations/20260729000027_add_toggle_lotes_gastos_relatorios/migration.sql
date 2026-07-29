-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "moduloGastosAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduloLotesAtivo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "moduloRelatoriosAtivo" BOOLEAN NOT NULL DEFAULT true;
