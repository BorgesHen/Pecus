-- CreateEnum
CREATE TYPE "EspecieAnimal" AS ENUM ('BOVINO', 'OVINO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CategoriaAnimal" ADD VALUE 'CORDEIRO';
ALTER TYPE "CategoriaAnimal" ADD VALUE 'BORREGO';
ALTER TYPE "CategoriaAnimal" ADD VALUE 'MARRA';
ALTER TYPE "CategoriaAnimal" ADD VALUE 'OVELHA';
ALTER TYPE "CategoriaAnimal" ADD VALUE 'CARNEIRO';
ALTER TYPE "CategoriaAnimal" ADD VALUE 'CAPAO';

-- AlterEnum
ALTER TYPE "TipoEventoSanitario" ADD VALUE 'AVALIACAO';

-- AlterTable
ALTER TABLE "Animal" ADD COLUMN     "especie" "EspecieAnimal" NOT NULL DEFAULT 'BOVINO';

-- AlterTable
ALTER TABLE "EventoReprodutivo" ADD COLUMN     "numeroCrias" INTEGER;

-- AlterTable
ALTER TABLE "EventoSanitario" ADD COLUMN     "escoreCorporal" DOUBLE PRECISION,
ADD COLUMN     "escoreFamacha" INTEGER;

-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "especie" "EspecieAnimal" NOT NULL DEFAULT 'BOVINO';
