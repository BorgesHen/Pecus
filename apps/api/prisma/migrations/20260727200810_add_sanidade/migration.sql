-- CreateEnum
CREATE TYPE "TipoEventoSanitario" AS ENUM ('VACINA', 'MEDICAMENTO', 'EXAME', 'OUTRO');

-- CreateTable
CREATE TABLE "EventoSanitario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "tipo" "TipoEventoSanitario" NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "proximaAplicacao" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoSanitario_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventoSanitario" ADD CONSTRAINT "EventoSanitario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoSanitario" ADD CONSTRAINT "EventoSanitario_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
