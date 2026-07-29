-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN     "moduloAreasAtivo" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Lote" ADD COLUMN     "areaId" TEXT;

-- AlterTable
ALTER TABLE "Piquete" ADD COLUMN     "areaId" TEXT,
ALTER COLUMN "loteId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "areaHectares" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lote" ADD CONSTRAINT "Lote_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piquete" ADD CONSTRAINT "Piquete_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: preserva o toggle de módulo (mesmo valor, campo renomeado)
UPDATE "Empresa" SET "moduloAreasAtivo" = "moduloPiquetesAtivo";

-- DataMigration: cria uma Area pra cada Lote que já tinha areaHectares ou
-- piquetes — reaproveita o id do lote como id da área nova, pra não
-- precisar correlacionar por nome depois (evita ambiguidade se dois lotes
-- tiverem a mesma identificação).
INSERT INTO "Area" (id, "empresaId", nome, "areaHectares", "createdAt")
SELECT l.id, l."empresaId", l.identificacao || ' (área)', l."areaHectares", now()
FROM "Lote" l
WHERE l."areaHectares" IS NOT NULL OR EXISTS (SELECT 1 FROM "Piquete" p WHERE p."loteId" = l.id);

-- DataMigration: vincula o lote à área recém-criada (mesmo id)
UPDATE "Lote" l SET "areaId" = l.id
WHERE l."areaHectares" IS NOT NULL OR EXISTS (SELECT 1 FROM "Piquete" p WHERE p."loteId" = l.id);

-- DataMigration: reaponta os piquetes existentes pra área do lote
UPDATE "Piquete" p SET "areaId" = l.id
FROM "Lote" l WHERE l.id = p."loteId";
