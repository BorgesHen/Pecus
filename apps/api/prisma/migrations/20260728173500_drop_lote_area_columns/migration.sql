-- DropForeignKey
ALTER TABLE "Piquete" DROP CONSTRAINT "Piquete_loteId_fkey";

-- AlterTable
ALTER TABLE "Empresa" DROP COLUMN "moduloPiquetesAtivo";

-- AlterTable
ALTER TABLE "Lote" DROP COLUMN "areaHectares";

-- AlterTable
ALTER TABLE "Piquete" DROP COLUMN "loteId",
ALTER COLUMN "areaId" SET NOT NULL;
