-- CreateTable
CREATE TABLE "PesagemAnimal" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "peso" DOUBLE PRECISION NOT NULL,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PesagemAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PesagemAnimal_animalId_data_idx" ON "PesagemAnimal"("animalId", "data");

-- AddForeignKey
ALTER TABLE "PesagemAnimal" ADD CONSTRAINT "PesagemAnimal_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
